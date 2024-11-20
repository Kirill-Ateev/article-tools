// Utility to map GraphQL types to SQLite data types
const graphqlToSqliteType = (type: string): string => {
  switch (type) {
    case 'ID':
    case 'String':
    case 'Bytes':
      return 'TEXT';
    case 'BigInt':
      return 'INTEGER';
    case 'Boolean':
      return 'BOOLEAN';
    default:
      return 'TEXT';
      throw new Error(`Unsupported GraphQL type: ${type}`);
  }
};

// Utility to get the base type of a field, handling nested wrappers
const getBaseType = (type: any): string => {
  let currentType = type;
  // Traverse nested type wrappers (NonNullType, ListType)
  while (
    currentType.kind === 'NonNullType' ||
    currentType.kind === 'ListType'
  ) {
    currentType = currentType.type;
  }
  if (!currentType.name?.value) {
    throw new Error(`Invalid type structure: ${JSON.stringify(type)}`);
  }
  return currentType.name.value;
};

// Extract types, fields, and relationships
export const getSchemaDetails = (parsedSchema: any) => {
  const types: { [key: string]: any } = {};
  const relationships: { [key: string]: any[] } = {};

  parsedSchema.definitions.forEach((def: any) => {
    if (def.kind === 'ObjectTypeDefinition' && def.name.value !== 'Query') {
      const typeName = def.name.value;
      const fields = def.fields.map((field: any) => {
        const fieldName = field.name.value;
        const baseType = getBaseType(field.type);
        const isList = field.type.kind === 'ListType';
        const isNullable = field.type.kind !== 'NonNullType';

        // Check for @derivedFrom directive
        const derivedFromDirective = field.directives?.find(
          (directive: any) => directive.name.value === 'derivedFrom'
        );
        const relationField =
          derivedFromDirective &&
          derivedFromDirective.arguments.find(
            (arg: any) => arg.name.value === 'field'
          )?.value.value;

        // Handle derived relationships
        if (relationField) {
          if (!relationships[baseType]) {
            relationships[baseType] = [];
          }
          relationships[baseType].push({
            relatedType: typeName,
            relatedField: fieldName,
            targetField: relationField,
          });
        }

        const correctedFieldName = ['table', 'to'].includes(fieldName)
          ? `${fieldName}_`
          : fieldName;

        return {
          name: relationField ? `${fieldName}Ids` : correctedFieldName,
          type: graphqlToSqliteType(baseType),
          isNullable,
          isList,
        };
      });
      types[typeName] = fields;
    }
  });
  return { types, relationships };
};

// Generate SQL table creation statements with inline foreign keys
export const generateTableSQLWithInlineFK = (
  types: { [key: string]: any },
  relationships: { [key: string]: any[] }
) => {
  const sqlStatements: string[] = [];

  for (const [typeName, fields] of Object.entries(types)) {
    const columns = fields.map((field: any) => {
      // const columnDef = `${field.name} ${field.type} ${
      //   field.isNullable ? '' : 'NOT NULL'
      // }${field.name === 'id' ? ' PRIMARY KEY' : ''}`;

      const columnDef = `${field.name} ${field.type} ${
        field.name === 'id' ? ' PRIMARY KEY' : ''
      }`;
      return columnDef;
    });

    // Add foreign key constraints
    // if (relationships[typeName]) {
    //   relationships[typeName].forEach((relation: any) => {
    //     const { relatedType, targetField, relatedField } = relation;
    //     columns.push(
    //       `${targetField}_id TEXT, FOREIGN KEY(${targetField}_id) REFERENCES ${relatedType}(id)`
    //     );
    //   });
    // }

    sqlStatements.push(
      `CREATE TABLE IF NOT EXISTS ${typeName} (${columns.join(', ')});`
    );
  }

  return sqlStatements;
};
