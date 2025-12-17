import { ProposedChange, AgentContext, ValidationResult } from '../agents/types.js';
import { access, readFile } from 'fs/promises';
import { join, extname, dirname } from 'path';

/**
 * Validator for proposed code changes
 */
export class ChangeValidator {
  /**
   * Validate a proposed change
   */
  async validate(
    change: ProposedChange,
    context: AgentContext
  ): Promise<ValidationResult> {
    const errors: string[] = [];
    const warnings: string[] = [];

    const fullPath = join(context.workingDir, change.filePath);

    switch (change.changeType) {
      case 'create': {
        // Check if file already exists
        try {
          await access(fullPath);
          errors.push(`File already exists: ${change.filePath}`);
        } catch {
          // File doesn't exist, good for creation
        }

        // Validate new content
        if (!change.newContent) {
          errors.push('New file must have content');
        } else {
          // Validate content for file type
          const contentValidation = this.validateContentForExtension(
            change.newContent,
            extname(change.filePath)
          );
          errors.push(...contentValidation.errors);
          warnings.push(...contentValidation.warnings);
        }
        break;
      }

      case 'modify': {
        // Check if file exists
        try {
          await access(fullPath);
        } catch {
          errors.push(`File does not exist: ${change.filePath}`);
        }

        // Validate that we have new content
        if (!change.newContent) {
          errors.push('Modified file must have new content');
        } else {
          // Validate content for file type
          const contentValidation = this.validateContentForExtension(
            change.newContent,
            extname(change.filePath)
          );
          errors.push(...contentValidation.errors);
          warnings.push(...contentValidation.warnings);
        }

        // Check if original content matches current file
        if (change.originalContent) {
          try {
            const currentContent = await readFile(fullPath, 'utf-8');
            if (currentContent !== change.originalContent) {
              warnings.push(
                'File has been modified since original content was captured'
              );
            }
          } catch {
            // File doesn't exist anymore
            errors.push('File no longer exists');
          }
        }
        break;
      }

      case 'delete': {
        // Check if file exists
        try {
          await access(fullPath);
        } catch {
          warnings.push(`File to delete does not exist: ${change.filePath}`);
        }

        // Warn about deleting certain file types
        if (
          change.filePath.endsWith('.test.ts') ||
          change.filePath.endsWith('.spec.ts') ||
          change.filePath.endsWith('.test.js') ||
          change.filePath.endsWith('.spec.js')
        ) {
          warnings.push('Deleting a test file - ensure this is intentional');
        }

        if (
          change.filePath === 'package.json' ||
          change.filePath === 'tsconfig.json'
        ) {
          errors.push('Cannot delete essential configuration files');
        }
        break;
      }
    }

    // Check change size
    if (change.newContent && change.newContent.length > 100000) {
      warnings.push(
        'Large file change (>100KB) - consider breaking into smaller changes'
      );
    }

    // Check for significant changes
    if (change.originalContent && change.newContent) {
      const changeRatio = this.calculateChangeRatio(
        change.originalContent,
        change.newContent
      );
      if (changeRatio > 0.8) {
        warnings.push(
          `Major file rewrite detected (${Math.round(changeRatio * 100)}% changed) - review carefully`
        );
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * Validate content matches expected file type
   */
  private validateContentForExtension(
    content: string,
    extension: string
  ): { errors: string[]; warnings: string[] } {
    const errors: string[] = [];
    const warnings: string[] = [];

    switch (extension.toLowerCase()) {
      case '.ts':
      case '.tsx':
      case '.js':
      case '.jsx': {
        // Basic syntax check for JavaScript/TypeScript
        const brackets = this.checkBrackets(content);
        if (!brackets.valid) {
          errors.push(`Unbalanced brackets: ${brackets.message}`);
        }

        // Check for common issues
        if (content.includes('console.log') && !content.includes('// DEBUG')) {
          warnings.push('Console.log found - consider removing before commit');
        }

        // Check for TODO comments
        const todoCount = (content.match(/TODO/gi) || []).length;
        if (todoCount > 0) {
          warnings.push(`${todoCount} TODO comment(s) found`);
        }
        break;
      }

      case '.json': {
        try {
          JSON.parse(content);
        } catch (e) {
          errors.push(
            `Invalid JSON: ${e instanceof Error ? e.message : 'parse error'}`
          );
        }
        break;
      }

      case '.yml':
      case '.yaml': {
        // Basic YAML validation - check for tab indentation
        if (content.includes('\t')) {
          errors.push('YAML files should use spaces, not tabs');
        }
        break;
      }

      case '.md': {
        // Markdown validation
        // Check for broken links syntax
        const brokenLinks = content.match(/\[.*?\]\(\s*\)/g);
        if (brokenLinks) {
          warnings.push(`${brokenLinks.length} empty link(s) found`);
        }
        break;
      }
    }

    return { errors, warnings };
  }

  /**
   * Check for balanced brackets
   */
  private checkBrackets(content: string): { valid: boolean; message?: string } {
    const stack: Array<{ char: string; line: number }> = [];
    const pairs: Record<string, string> = { ')': '(', ']': '[', '}': '{' };
    const opens = new Set(['(', '[', '{']);

    // Skip strings and comments for bracket checking
    let inString = false;
    let stringChar = '';
    let inComment = false;
    let inMultilineComment = false;
    let line = 1;

    for (let i = 0; i < content.length; i++) {
      const char = content[i];
      const nextChar = content[i + 1];
      const prevChar = content[i - 1];

      if (char === '\n') {
        line++;
        inComment = false;
        continue;
      }

      // Handle strings
      if ((char === '"' || char === "'" || char === '`') && prevChar !== '\\') {
        if (!inString && !inComment && !inMultilineComment) {
          inString = true;
          stringChar = char;
        } else if (inString && char === stringChar) {
          inString = false;
        }
        continue;
      }

      if (inString) continue;

      // Handle comments
      if (char === '/' && nextChar === '/') {
        inComment = true;
        continue;
      }
      if (char === '/' && nextChar === '*') {
        inMultilineComment = true;
        continue;
      }
      if (char === '*' && nextChar === '/') {
        inMultilineComment = false;
        i++; // Skip the /
        continue;
      }

      if (inComment || inMultilineComment) continue;

      // Check brackets
      if (opens.has(char)) {
        stack.push({ char, line });
      } else if (pairs[char]) {
        const last = stack.pop();
        if (!last || last.char !== pairs[char]) {
          return {
            valid: false,
            message: `Unmatched '${char}' at line ${line}`,
          };
        }
      }
    }

    if (stack.length > 0) {
      const unclosed = stack[stack.length - 1];
      return {
        valid: false,
        message: `Unclosed '${unclosed.char}' from line ${unclosed.line}`,
      };
    }

    return { valid: true };
  }

  /**
   * Calculate how much of the file changed
   */
  private calculateChangeRatio(original: string, modified: string): number {
    const originalLines = original.split('\n');
    const modifiedLines = modified.split('\n');

    // Simple line-based change detection
    const originalSet = new Set(originalLines.map((l) => l.trim()));
    const modifiedSet = new Set(modifiedLines.map((l) => l.trim()));

    let changedLines = 0;
    for (const line of modifiedSet) {
      if (!originalSet.has(line)) {
        changedLines++;
      }
    }
    for (const line of originalSet) {
      if (!modifiedSet.has(line)) {
        changedLines++;
      }
    }

    const totalLines = Math.max(originalLines.length, modifiedLines.length);
    return totalLines > 0 ? changedLines / (totalLines * 2) : 0;
  }
}
