import { existsSync, readFileSync, writeFileSync } from 'fs';

// Method Decorator
export function Cached() {
  return function (
    target: Object,
    key: string | symbol,
    descriptor: PropertyDescriptor
  ) {
    const original = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      const fileName = `cache/${original.name}_${args.join('_')}.json`;
      if (existsSync(fileName)) {
        return JSON.parse(readFileSync(fileName).toString());
      } else {
        const result = await original.apply(this, args);
        writeFileSync(fileName, JSON.stringify(result));
        return result;
      }
    };

    return descriptor;
  };
}
