'use client'
import React from 'react'

/**
 * Creates a context and its provider component.
 *
 * @template TContextValue - The type of the context value.
 * @param {string} rootComponentName - The name of the root component.
 * @param {ContextValueType | undefined} defaultContext - The default context value.
 * @returns {[Provider, useContext]} - An array containing the provider component and the useContext function.
 */
function createContext<TContextValue extends object | null>(
  rootComponentName: string,
  defaultContext?: TContextValue,
) {
  const Context = React.createContext<TContextValue | undefined>(defaultContext)

  function Provider(props: TContextValue & { children: React.ReactNode }) {
    const { children, ...context } = props
    // Only re-memoize when prop values change
    const value = React.useMemo(() => context, Object.values(context)) as TContextValue
    return <Context.Provider value={value}>{children}</Context.Provider>
  }

  function useContext(consumerName: string) {
    const context = React.useContext(Context)
    if (context) return context
    if (defaultContext !== undefined) return defaultContext
    // if a defaultContext wasn't specified, it's a required context.
    throw new Error(`\`${consumerName}\` must be used within \`${rootComponentName}\``)
  }

  Provider.displayName = rootComponentName + 'Provider'
  return [Provider, useContext] as const
}

export type CardContextValue = {
  state?: 'idle' | 'loading' | 'error' | 'success' | 'active'
  loader?: <T = null>() => Promise<T | null>
}

const NAME = 'Card'

const [CardProvider, useCardContext] = createContext<CardContextValue>(NAME)

export { CardProvider, useCardContext }
