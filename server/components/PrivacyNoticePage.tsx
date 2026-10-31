import type { PrivacyDocument } from '../lib/privacyNoticeContent';

const styles = {
  main: {
    maxWidth: 640,
    margin: '0 auto',
    padding: '24px 20px 48px',
    fontFamily:
      '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
    lineHeight: 1.55,
    color: '#111114',
    backgroundColor: '#f7f7f8',
    minHeight: '100vh',
    boxSizing: 'border-box' as const,
  },
  title: {
    fontSize: 26,
    fontWeight: 700,
    margin: '0 0 8px',
  },
  updated: {
    fontSize: 14,
    color: '#5e5e63',
    margin: '0 0 28px',
  },
  section: {
    marginBottom: 24,
  },
  h2: {
    fontSize: 18,
    fontWeight: 700,
    margin: '0 0 8px',
  },
  p: {
    fontSize: 16,
    margin: '0 0 10px',
  },
  ul: {
    margin: '0 0 10px',
    paddingLeft: 22,
    fontSize: 16,
  },
  li: {
    marginBottom: 6,
  },
};

export function PrivacyNoticePage({ doc }: { doc: PrivacyDocument }) {
  return (
    <main style={styles.main}>
      <h1 style={styles.title}>{doc.pageTitle}</h1>
      <p style={styles.updated}>{doc.lastUpdatedLabel}</p>
      {doc.sections.map((section) => (
        <section key={section.title} style={styles.section}>
          <h2 style={styles.h2}>{section.title}</h2>
          {section.paragraphs.map((paragraph) => (
            <p key={paragraph} style={styles.p}>
              {paragraph}
            </p>
          ))}
          {section.bullets ? (
            <ul style={styles.ul}>
              {section.bullets.map((item) => (
                <li key={item} style={styles.li}>
                  {item}
                </li>
              ))}
            </ul>
          ) : null}
        </section>
      ))}
    </main>
  );
}
