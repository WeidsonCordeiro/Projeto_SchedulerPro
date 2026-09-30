export default function FullPageLoader() {
  return (
    <div className="full-page-loader">
      <div className="brand-mark" aria-hidden="true">S</div>
      <div className="loading-state" role="status">
        <span className="spinner-border spinner-border-sm text-primary" aria-hidden="true" />
        <span>Carregando...</span>
      </div>
    </div>
  );
}
