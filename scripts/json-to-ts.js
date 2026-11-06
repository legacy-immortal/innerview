#!/usr/bin/env node

/**
 * JSON to TypeScript Type Generator
 * Analyzes JSON structure and generates TypeScript interfaces
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class TypeGenerator {
  constructor() {
    this.types = new Map();
    this.typeCounter = 0;
  }

  /**
   * Generate a unique type name
   */
  generateTypeName(baseName = 'GeneratedType') {
    this.typeCounter++;
    return `${baseName}${this.typeCounter}`;
  }

  /**
   * Check if value is a plain object
   */
  isObject(value) {
    return value !== null && typeof value === 'object' && !Array.isArray(value);
  }

  /**
   * Check if value is an array
   */
  isArray(value) {
    return Array.isArray(value);
  }

  /**
   * Check if object looks like a mapping object (has mixed key types)
   */
  isMappingObject(obj) {
    if (!this.isObject(obj) || Array.isArray(obj)) return false;

    const keys = Object.keys(obj);
    if (keys.length === 0) return false;

    // Check if keys include both strings and numbers, or look like IDs
    const hasNumericKeys = keys.some((key) => /^\d+$/.test(key));
    const hasStringKeys = keys.some((key) => !/^\d+$/.test(key));

    return hasNumericKeys && hasStringKeys;
  }

  /**
   * Check if string is a valid TypeScript identifier
   */
  isValidIdentifier(str) {
    return /^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(str);
  }

  /**
   * Get TypeScript type for a primitive value
   */
  getPrimitiveType(value) {
    if (value === null) return 'null';
    if (typeof value === 'string') return 'string';
    if (typeof value === 'number') return 'number';
    if (typeof value === 'boolean') return 'boolean';
    return 'any';
  }

  /**
   * Analyze an object and generate its type definition
   */
  analyzeObject(obj, typeName = null) {
    if (!this.isObject(obj)) {
      return this.getPrimitiveType(obj);
    }

    // Handle mapping objects with mixed key types specially
    if (this.isMappingObject(obj)) {
      return this.analyzeMapping(obj, typeName);
    }

    const properties = {};
    const required = new Set();

    // First pass: collect all properties and check if they're required
    const allKeys = new Set();
    if (Array.isArray(obj) && obj.length > 0) {
      // For arrays of objects, analyze the first few elements
      const sampleSize = Math.min(obj.length, 3);
      for (let i = 0; i < sampleSize; i++) {
        if (this.isObject(obj[i])) {
          Object.keys(obj[i]).forEach((key) => allKeys.add(key));
        }
      }
    } else {
      Object.keys(obj).forEach((key) => allKeys.add(key));
    }

    // Analyze each property
    for (const key of allKeys) {
      let values = [];

      if (Array.isArray(obj)) {
        // For arrays, collect values from all objects
        values = obj
          .filter((item) => this.isObject(item) && item[key] !== undefined)
          .map((item) => item[key]);
      } else {
        if (obj[key] !== undefined) {
          values = [obj[key]];
          required.add(key);
        }
      }

      if (values.length === 0) continue;

      const propertyType = this.analyzeValue(values, key);
      properties[key] = {
        type: propertyType,
        required: required.has(key),
      };
    }

    // Generate interface
    const interfaceName = typeName || this.generateTypeName();
    let interfaceDef = `export interface ${interfaceName} {\n`;

    for (const [key, info] of Object.entries(properties)) {
      const optional = info.required ? '' : '?';
      // Handle invalid identifier keys (starting with numbers)
      const safeKey = this.isValidIdentifier(key) ? key : `"${key}"`;
      interfaceDef += `  ${safeKey}${optional}: ${info.type};\n`;
    }

    interfaceDef += '}\n\n';

    this.types.set(interfaceName, interfaceDef);
    return interfaceName;
  }

  /**
   * Analyze a mapping object and generate a Record type
   */
  analyzeMapping(obj, typeName = null) {
    const values = Object.values(obj);
    if (values.length === 0) return 'Record<string, any>';

    // Analyze the structure of values to determine the value type
    const valueType = this.analyzeValue(values, 'MappingValue');

    // For mappings with mixed keys, use Record type with union of key types
    const keys = Object.keys(obj);
    const keyTypes = [
      ...new Set(keys.map((key) => (/^\d+$/.test(key) ? 'number' : 'string'))),
    ];

    const keyType = keyTypes.length === 1 ? keyTypes[0] : 'string | number';

    return `Record<${keyType}, ${valueType}>`;
  }

  /**
   * Analyze a value and determine its TypeScript type
   */
  analyzeValue(values, propertyName = '') {
    if (values.length === 0) return 'any';

    // Check if all values are the same type
    const firstValue = values[0];
    const allSameType = values.every((v) => typeof v === typeof firstValue);

    if (allSameType) {
      if (this.isArray(firstValue)) {
        return this.analyzeArray(values, propertyName);
      } else if (this.isObject(firstValue)) {
        return this.analyzeObject(firstValue, this.toPascalCase(propertyName));
      } else {
        return this.getPrimitiveType(firstValue);
      }
    } else {
      // Mixed types - use union
      const types = [
        ...new Set(
          values.map((v) => {
            if (this.isArray(v)) return this.analyzeArray([v], propertyName);
            if (this.isObject(v))
              return this.analyzeObject(v, this.toPascalCase(propertyName));
            return this.getPrimitiveType(v);
          })
        ),
      ];
      return types.join(' | ');
    }
  }

  /**
   * Analyze an array and generate its type
   */
  analyzeArray(arrays, propertyName = '') {
    const elementTypes = [];

    for (const arr of arrays) {
      if (!Array.isArray(arr) || arr.length === 0) {
        elementTypes.push('any');
        continue;
      }

      // Analyze first few elements to determine type
      const sampleSize = Math.min(arr.length, 3);
      for (let i = 0; i < sampleSize; i++) {
        const elementType = this.analyzeValue([arr[i]], propertyName + 'Item');
        if (!elementTypes.includes(elementType)) {
          elementTypes.push(elementType);
        }
      }
    }

    const uniqueTypes = [...new Set(elementTypes)];
    const elementType =
      uniqueTypes.length === 1
        ? uniqueTypes[0]
        : `(${uniqueTypes.join(' | ')})`;

    return `${elementType}[]`;
  }

  /**
   * Convert string to PascalCase
   */
  toPascalCase(str) {
    return str
      .replace(/[^a-zA-Z0-9]/g, ' ')
      .split(' ')
      .filter((word) => word)
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join('');
  }

  /**
   * Generate types from JSON data
   */
  generate(jsonData, rootTypeName = 'Root') {
    let data;
    try {
      data = typeof jsonData === 'string' ? JSON.parse(jsonData) : jsonData;
    } catch (e) {
      throw new Error('Invalid JSON data');
    }

    this.types.clear();
    this.typeCounter = 0;

    const rootType = this.analyzeValue([data], rootTypeName);

    // Generate the complete type definitions
    let output = '// Generated TypeScript types from JSON structure\n\n';
    output += Array.from(this.types.values()).join('');

    // Add root type export (avoid redundant type alias)
    if (rootType !== rootTypeName) {
      output += `export type ${rootTypeName} = ${rootType};\n`;
    }

    return output;
  }

  /**
   * Generate types from JSON file
   */
  generateFromFile(filePath, rootTypeName = 'Root') {
    if (!fs.existsSync(filePath)) {
      throw new Error(`File not found: ${filePath}`);
    }

    const content = fs.readFileSync(filePath, 'utf8');
    return this.generate(content, rootTypeName);
  }
}

// CLI functionality
function main() {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    console.log('Usage:');
    console.log(
      '  node json-to-ts.js <json-file> [output-file] [root-type-name]'
    );
    console.log('  node json-to-ts.js --help');
    console.log('');
    console.log('Examples:');
    console.log('  node json-to-ts.js data.json');
    console.log('  node json-to-ts.js data.json types.ts ConversationData');
    console.log('  node json-to-ts.js --stdin types.ts ApiResponse');
    return;
  }

  if (args[0] === '--help' || args[0] === '-h') {
    console.log('JSON to TypeScript Type Generator');
    console.log('');
    console.log(
      'This tool analyzes JSON structure and generates TypeScript interfaces.'
    );
    console.log('');
    console.log('Usage:');
    console.log(
      '  node json-to-ts.js <json-file> [output-file] [root-type-name]'
    );
    console.log('  node json-to-ts.js --stdin [output-file] [root-type-name]');
    console.log('');
    console.log('Options:');
    console.log('  --stdin    Read JSON from stdin instead of file');
    console.log('  --help     Show this help message');
    console.log('');
    console.log('Examples:');
    console.log('  node json-to-ts.js conversations.json');
    console.log('  node json-to-ts.js data.json types.ts MyData');
    console.log('  cat data.json | node json-to-ts.js --stdin types.ts');
    return;
  }

  const generator = new TypeGenerator();

  try {
    let jsonData;
    let outputFile;
    let rootTypeName = 'Root';

    let types;

    if (args[0] === '--stdin') {
      // Read from stdin
      const jsonData = fs.readFileSync(0, 'utf8');
      outputFile = args[1];
      rootTypeName = args[2] || rootTypeName;
      types = generator.generate(jsonData, rootTypeName);
    } else {
      // Read from file
      const inputFile = args[0];
      outputFile = args[1];
      rootTypeName = args[2] || rootTypeName;
      types = generator.generateFromFile(inputFile, rootTypeName);
    }

    if (outputFile) {
      fs.writeFileSync(outputFile, types);
      console.log(`TypeScript types generated and saved to ${outputFile}`);
    } else {
      console.log(types);
    }
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

// Export for use as module
export default TypeGenerator;

// Run CLI if called directly
if (process.argv[1].endsWith('json-to-ts.js')) {
  main();
}
