import './styles/page.css'

export function Page({ children }: React.PropsWithChildren<{}>) {
  return <div className="Page">{children}</div>
}
