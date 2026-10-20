type JsonLdProps = {
  data: Record<string, unknown>;
};

/** Renders a JSON-LD script. `<` is escaped so content can never close the tag. */
export function JsonLd({ data }: JsonLdProps) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, "\\u003c") }}
    />
  );
}
