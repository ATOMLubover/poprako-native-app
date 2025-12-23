declare module "./TeamSelector" {
  import { FC } from "react";

  type Team = { teamId: string; name: string };

  type TeamSelectorProps = {
    onSearchTeams?: (query: string) => Promise<Team[]>;
    placeholder?: string;
    onSelect?: (teamId: string) => void;
    onExit?: () => void;
    teams?: Team[];
  };

  const TeamSelector: FC<TeamSelectorProps>;

  export default TeamSelector;
}
