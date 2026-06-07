import { clsx } from 'clsx'
import type { ClassValue } from 'clsx'

export function cn(...inputs: Array<ClassValue>) {
  return clsx(inputs)
}

const Delimiter = {
  Default: '--',
  Nested: '__',
  Short: '-',
}

interface CreateVariantOptions {
  delimiter?: string
  type?: string
}

export function createVariant(
  block: string,
  variant: string,
  state?: string,
  options: CreateVariantOptions = { delimiter: Delimiter.Default },
) {
  return [
    block,
    options.delimiter,
    options.type && `${options.type}${Delimiter.Short}`,
    variant,
    state && `${Delimiter.Short}${state}`,
  ]
    .filter(Boolean)
    .join('')
}

export function styled(block: string) {
  return {
    variantClassName: (variant: string, state?: string) =>
      createVariant(block, variant, state),
    variantClassNames: <T extends string>(
      variants: ReadonlyArray<T>,
      type?: string,
      state?: string,
    ) =>
      variants.reduce<Record<T, string>>(
        (acc, variant) => {
          acc[variant] = createVariant(block, variant, state, {
            type,
            delimiter: Delimiter.Default,
          })
          return acc
        },
        {} as Record<T, string>,
      ),
    nestedClassName: (slot: string, state?: string) =>
      createVariant(block, slot, state, { delimiter: Delimiter.Nested }),
  }
}
