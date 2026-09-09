export default function PlaceholderPage({ title }: { title: string }) {
  return (
    <section>
      <h1 className="h3 mb-3">{title}</h1>
      <p className="text-muted">
        Esta funcionalidade será implementada em uma próxima etapa.
      </p>
    </section>
  );
}
