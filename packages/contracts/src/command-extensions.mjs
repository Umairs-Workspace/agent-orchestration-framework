import { commandError } from './error.mjs';

// An owner opts into additive input fields at a named point:
// extensionPoints: { placement: { contributors: ['@aof/mesh'], flags: ['node'], arguments: [] } }
// A contribution supplies { commandId, point, flags, arguments }. Names are also input keys.
// Positional additions require cli.spec.arguments to describe the owner's existing positions.
// No extension can replace a route, handler, renderer, existing input field, or common flag.
export function extendCommand(command, extension, contributor) {
  const point = command.extensionPoints?.[extension.point];
  const label = `Command extension "${command.id}/${extension.point}" from "${contributor}"`;
  const fail = message => { throw new TypeError(`${label}: ${message}`); };
  if (!point || !Array.isArray(point.contributors) || !point.contributors.includes(contributor)) {
    fail('the owner has not declared this extension point for this contributor.');
  }
  for (const key of Object.keys(extension)) {
    if (!['commandId', 'point', 'flags', 'arguments'].includes(key)) fail(`cannot replace or supply "${key}".`);
  }
  const flags = extension.flags ?? {};
  const args = extension.arguments ?? [];
  if (!flags || typeof flags !== 'object' || Array.isArray(flags) || !Array.isArray(args)) fail('invalid flags or arguments.');
  if (!Object.keys(flags).length && !args.length) fail('no input additions supplied.');
  if (typeof command.cli?.argv !== 'function') fail('the owner must supply a CLI argv adapter.');
  if (command.input?.type && command.input.type !== 'object') fail('input additions require an object input schema.');
  const spec = command.cli.spec ?? {};
  if (args.length && !Array.isArray(spec.arguments)) fail('positional additions require the owner to declare cli.spec.arguments.');
  const fields = [];
  const claimed = new Set([
    ...Object.keys(command.input?.properties ?? {}),
    ...(spec.arguments ?? []).map(argument => typeof argument === 'string' ? argument : argument.name),
  ]);
  const claim = (name, definition, allowed, kind) => {
    if (typeof name !== 'string' || !/^[a-z][a-zA-Z0-9]*$/.test(name)) fail(`invalid ${kind} name "${name}".`);
    if (!Array.isArray(allowed) || !allowed.includes(name)) fail(`${kind} "${name}" is not declared at this point.`);
    if (claimed.has(name) || name === 'json' || name === 'config' || Object.hasOwn(spec.flags ?? {}, name)) {
      fail(`input collision for "${name}".`);
    }
    if (!definition || !['string', 'boolean'].includes(definition.type) || (kind === 'argument' && definition.type !== 'string')) {
      fail(`invalid type for "${name}".`);
    }
    if (definition.required !== undefined && typeof definition.required !== 'boolean') fail(`invalid required marker for "${name}".`);
    if (definition.enum !== undefined && (!Array.isArray(definition.enum) || !definition.enum.length || definition.enum.some(v => typeof v !== definition.type))) {
      fail(`invalid enum for "${name}".`);
    }
    if (definition.default !== undefined && (typeof definition.default !== definition.type || (definition.enum && !definition.enum.includes(definition.default)))) {
      fail(`invalid default for "${name}".`);
    }
    claimed.add(name);
    fields.push({ ...definition, name });
  };
  for (const [name, definition] of Object.entries(flags)) claim(name, definition, point.flags, 'flag');
  for (const arg of args) claim(arg?.name, arg, point.arguments, 'argument');
  const baseArgCount = spec.arguments?.length ?? 0;
  const properties = Object.fromEntries(fields.map(({ name, type, enum: values, default: fallback, description }) => [name, {
    type, ...(values ? { enum: values } : {}), ...(fallback !== undefined ? { default: fallback } : {}), ...(description ? { description } : {}),
  }]));
  function withFields(input, values = input) {
    const result = { ...input };
    for (const field of fields) {
      const supplied = values?.[field.name];
      const value = supplied === undefined ? field.default : supplied;
      if (value === undefined) {
        if (field.required) throw commandError(`Missing required input "${field.name}" for ${command.id}.`, 'invalid-input', 400);
        continue;
      }
      if (typeof value !== field.type || (field.enum && !field.enum.includes(value))) {
        throw commandError(`Invalid input "${field.name}" for ${command.id}.`, 'invalid-input', 400);
      }
      result[field.name] = value;
    }
    return result;
  }
  return {
    ...command,
    input: {
      ...command.input,
      properties: { ...command.input?.properties, ...properties },
      required: [...(command.input?.required ?? []), ...fields.filter(f => f.required).map(f => f.name)],
    },
    run: (input, ctx) => command.run(withFields(input), ctx),
    cli: {
      ...command.cli,
      spec: { ...spec, flags: { ...spec.flags, ...flags }, ...(args.length ? { arguments: [...spec.arguments, ...args] } : {}) },
      async argv(positionals, options) {
        const basePositionals = args.length ? positionals.slice(0, baseArgCount) : positionals;
        if (args.length && positionals.length > baseArgCount + args.length) {
          throw commandError(`Too many positional arguments for ${command.id}.`, 'invalid-input', 400);
        }
        const baseOptions = Object.fromEntries(Object.entries(options).filter(([name]) => !Object.hasOwn(flags, name)));
        baseOptions._ = basePositionals;
        const input = await command.cli.argv(basePositionals, baseOptions);
        const values = Object.fromEntries(Object.keys(flags).map(name => [name, options[name]]));
        args.forEach((arg, index) => { values[arg.name] = positionals[baseArgCount + index]; });
        return withFields(input, values);
      },
    },
  };
}
