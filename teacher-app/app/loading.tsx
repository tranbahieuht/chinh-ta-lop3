export default function Loading() {
  return <section className="page-shell" aria-label="Đang tải"><div className="skeleton heading-skeleton"/><div className="skeleton-grid">{Array.from({ length: 6 }, (_, index) => <i className="skeleton" key={index}/>)}</div></section>;
}
