import { FadeIn } from "@/components/PageTransition";

interface PageHeaderProps {
  title: string;
  highlight?: string;
  description?: string;
  children?: React.ReactNode;
  className?: string;
}

export default function PageHeader({
  title,
  highlight,
  description,
  children,
  className,
}: PageHeaderProps) {
  return (
    <FadeIn>
      <div
        className={`flex flex-col md:flex-row justify-between items-start md:items-center gap-6 ${className}`}
      >
        <div>
          <h1
            className="text-4xl md:text-5xl font-black tracking-tight mb-2 text-balance"
            style={{ color: "var(--text-primary)" }}
          >
            {title} {highlight && <span className="gradient-text">{highlight}</span>}
          </h1>
          {description && <p className="text-[var(--text-muted)] max-w-2xl">{description}</p>}
        </div>

        {children && <div className="flex items-center gap-3">{children}</div>}
      </div>
    </FadeIn>
  );
}
