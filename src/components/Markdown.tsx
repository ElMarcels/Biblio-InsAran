import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

/**
 * Renderizado de Markdown con el aspecto del sistema de diseño.
 * Se usa para las novedades de la plataforma (changelog). `react-markdown`
 * no interpreta HTML crudo, así que el contenido publicado es seguro.
 */

const ELEMENTS = {
  h1: "font-display mt-6 mb-2 text-[22px] font-bold first:mt-0",
  h2: "font-display mt-6 mb-2 text-[19px] font-bold first:mt-0",
  h3: "font-display mt-5 mb-1.5 text-[16px] font-semibold first:mt-0",
  h4: "font-display mt-4 mb-1.5 text-[15px] font-semibold first:mt-0",
  p: "my-3 text-[15px] leading-relaxed text-ink-soft first:mt-0 last:mb-0",
  ul: "my-3 flex list-disc flex-col gap-1.5 pl-6 text-[15px] leading-relaxed text-ink-soft",
  ol: "my-3 flex list-decimal flex-col gap-1.5 pl-6 text-[15px] leading-relaxed text-ink-soft",
  li: "leading-relaxed [&>p]:my-0",
  strong: "font-semibold text-ink",
  em: "italic",
  a: "font-semibold text-accent underline underline-offset-2",
  code: "rounded border border-hairline bg-paper px-1 py-0.5 font-mono text-[13px]",
  pre: "my-3 overflow-x-auto border-2 border-line bg-paper p-3 font-mono text-[13px] [&_code]:border-0 [&_code]:bg-transparent [&_code]:p-0",
  blockquote:
    "my-3 border-l-4 border-accent pl-4 text-[15px] italic leading-relaxed text-ink-soft [&>p]:my-1",
  hr: "my-5 border-t-2 border-hairline",
  table: "my-3 w-full border-collapse text-[14px]",
  thead: "border-b-2 border-line",
  th: "border border-hairline bg-paper px-3 py-1.5 text-left text-[13px] font-semibold",
  td: "border border-hairline px-3 py-1.5",
} as const;

export function Markdown({ children }: { children: string }) {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      components={{
        h1: (props) => <h1 className={ELEMENTS.h1} {...props} />,
        h2: (props) => <h2 className={ELEMENTS.h2} {...props} />,
        h3: (props) => <h3 className={ELEMENTS.h3} {...props} />,
        h4: (props) => <h4 className={ELEMENTS.h4} {...props} />,
        p: (props) => <p className={ELEMENTS.p} {...props} />,
        ul: (props) => <ul className={ELEMENTS.ul} {...props} />,
        ol: (props) => <ol className={ELEMENTS.ol} {...props} />,
        li: (props) => <li className={ELEMENTS.li} {...props} />,
        strong: (props) => <strong className={ELEMENTS.strong} {...props} />,
        em: (props) => <em className={ELEMENTS.em} {...props} />,
        a: (props) => <a className={ELEMENTS.a} {...props} />,
        code: (props) => <code className={ELEMENTS.code} {...props} />,
        pre: (props) => <pre className={ELEMENTS.pre} {...props} />,
        blockquote: (props) => <blockquote className={ELEMENTS.blockquote} {...props} />,
        hr: (props) => <hr className={ELEMENTS.hr} {...props} />,
        table: (props) => <table className={ELEMENTS.table} {...props} />,
        thead: (props) => <thead className={ELEMENTS.thead} {...props} />,
        th: (props) => <th className={ELEMENTS.th} {...props} />,
        td: (props) => <td className={ELEMENTS.td} {...props} />,
      }}
    >
      {children}
    </ReactMarkdown>
  );
}
