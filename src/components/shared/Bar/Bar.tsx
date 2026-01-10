import './Bar.css'

export function Bar({ height, width }: { height?: number; width?: number }) {
  return (
    <div className="Bar" style={{ height, width }}>
      <div className="Bar__Squibbles" />
    </div>
  )
}
