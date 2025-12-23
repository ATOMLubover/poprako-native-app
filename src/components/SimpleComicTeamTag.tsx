import "./SimpleComicTeamTag.css";

type SimpleComicTeamTagProps = {
  name: string;
  className?: string;
};

/**
 * SimpleComicTeamTag 组件
 * 为 SimpleComicItem 提供一个紧凑的 team 名称 pill，节省空间
 */
export default function SimpleComicTeamTag({ name, className }: SimpleComicTeamTagProps) {
  return (
    <div className={`simple-comic-team-tag ${className ?? ""}`} title={name}>
      {name}
    </div>
  );
}
