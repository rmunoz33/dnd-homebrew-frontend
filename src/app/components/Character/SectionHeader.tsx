import { medievalFont } from "@/app/components/medievalFont";

const SectionHeader = ({ title }: { title: string }) => {
  return (
    <div className="col-span-full flex items-center gap-3 mt-6 mb-3">
      <span className="flex-1 h-px bg-primary/15" />
      <h2
        className={`${medievalFont.className} text-lg text-primary/80 whitespace-nowrap`}
      >
        {title}
      </h2>
      <span className="flex-1 h-px bg-primary/15" />
    </div>
  );
};

export { SectionHeader };
