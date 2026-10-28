import Link from "next/link";
import type { MarketingGuide } from "@/lib/marketingGuides";

type Props = {
  guide: MarketingGuide;
};

export function GuideArticleBody({ guide }: Props) {
  return (
    <article className="guide-article">
      {guide.sections.map((section, i) => (
        <section key={i} className="guide-article__section">
          {section.heading ? <h2>{section.heading}</h2> : null}
          {section.paragraphs?.map((p, j) => (
            <p key={j}>{p}</p>
          ))}
          {section.bullets?.length ? (
            <ul>
              {section.bullets.map((b) => (
                <li key={b}>{b}</li>
              ))}
            </ul>
          ) : null}
        </section>
      ))}
      <p className="guide-article__help">
        Yeterli değil mi?{" "}
        <Link href="/destek">Destek merkezi</Link> ·{" "}
        <a href="mailto:destek@lerta.com.tr">destek@lerta.com.tr</a>
      </p>
    </article>
  );
}
