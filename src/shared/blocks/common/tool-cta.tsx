import { Layers } from 'lucide-react';

const shell =
  'mx-auto w-[min(1216px,calc(100%-40px))] max-[760px]:w-[min(calc(100%-28px),620px)]';

export function ToolCta({
  title,
  text,
  label,
  href,
}: {
  title: string;
  text: string;
  label: string;
  href: string;
}) {
  return (
    <section className="bg-vault-navy py-[150px] text-center max-[760px]:py-[100px]">
      <div className={`${shell} flex flex-col items-center`}>
        <Layers
          className="text-primary"
          size={38}
          strokeWidth={1.2}
          aria-hidden="true"
        />
        <h2 className="mt-[30px] max-w-[850px] [font-family:var(--font-heading),var(--font-sans)] text-[clamp(40px,5vw,70px)] leading-none font-medium tracking-[-0.055em]">
          {title}
        </h2>
        <p className="text-muted-foreground mt-5 max-w-[640px] text-sm leading-[1.75]">
          {text}
        </p>
        <a
          href={href}
          className="bg-primary text-primary-foreground hover:bg-primary/90 mt-[34px] inline-flex min-h-[42px] items-center rounded-lg px-[22px] font-mono text-xs font-extrabold tracking-[0.04em] uppercase"
        >
          {label}
        </a>
      </div>
    </section>
  );
}
