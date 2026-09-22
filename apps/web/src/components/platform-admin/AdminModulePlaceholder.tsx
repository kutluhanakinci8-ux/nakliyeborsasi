type AdminModulePlaceholderProps = {
  title: string;
  lead: string;
  bullets: string[];
};

export function AdminModulePlaceholder({
  title,
  lead,
  bullets,
}: AdminModulePlaceholderProps) {
  return (
    <section className="platform-admin-panel">
      <header className="platform-admin-panel-head">
        <h1 className="platform-admin-page-title">{title}</h1>
        <p className="platform-admin-page-lead">{lead}</p>
      </header>
      <ul className="admin-checklist">
        {bullets.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
      <p className="platform-admin-soon">
        Bu modül API bağlantısı ile bir sonraki sprintte açılacak. Organizasyon
        yönetimi şu an tam işlevsel (demo depolama).
      </p>
    </section>
  );
}
