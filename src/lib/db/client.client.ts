// Client-side mock of the database client.
// This prevents database and Node modules (pg, prisma) from being bundled into the client browser code.

export const prisma = new Proxy(
  {},
  {
    get() {
      return () => {
        throw new Error('Database client cannot be accessed on the client-side.')
      }
    },
  },
)
