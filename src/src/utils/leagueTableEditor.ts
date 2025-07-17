// src/utils/leagueTableEditor.ts
import { LeagueCompetition, LeagueGroup, LeagueMatch } from 'types';
import { deepClone } from 'utils/deepClone';
import { generateFixturesForGroup } from 'utils/leagueGenerator';

const addMinutesToTime = (time: string, minutes: number): string => {
    const [hours, mins] = time.split(':').map(Number);
    const date = new Date();
    date.setHours(hours, mins, 0, 0);
    date.setMinutes(date.getMinutes() + minutes);
    const newHours = date.getHours().toString().padStart(2, '0');
    const newMins = date.getMinutes().toString().padStart(2, '0');
    return `${newHours}:${newMins}`;
};

export const moveTeamBetweenGroups = (
  currentLeagueCompetition: LeagueCompetition,
  teamIdToMove: string,
  sourceGroupName: string,
  targetGroupName: string,
  numberOfCourts: number,
  eventStartTime?: string,
  matchDurationInMinutes?: number,
  restTimeInMinutes?: number
): LeagueCompetition | null => {
  if (!currentLeagueCompetition || !teamIdToMove || !sourceGroupName || !targetGroupName || numberOfCourts < 1) {
      console.error("Invalid arguments for moving team.", {currentLeagueCompetition, teamIdToMove, sourceGroupName, targetGroupName, numberOfCourts});
      return null;
  }
  if (sourceGroupName === targetGroupName) return currentLeagueCompetition; 

  const newCompetition: LeagueCompetition = deepClone(currentLeagueCompetition);
  const leagueTable = newCompetition.preliminaryRound;

  const sourceGroup = leagueTable.groups.find(g => g.name === sourceGroupName);
  const targetGroup = leagueTable.groups.find(g => g.name === targetGroupName);

  if (!sourceGroup || !targetGroup) {
      console.error("Source or target group not found for moving team.");
      return null;
  }

  const teamIndexInSourceGroup = sourceGroup.teams.findIndex(ts => ts.team.id === teamIdToMove);

  if (teamIndexInSourceGroup === -1) {
      console.error("Team to move not found in the source group.");
      return null;
  }
  
  const [teamStatsToMove] = sourceGroup.teams.splice(teamIndexInSourceGroup, 1);
  targetGroup.teams.push(teamStatsToMove);

  [sourceGroup, targetGroup].forEach(group => {
      group.teams.forEach(stats => {
          stats.played = 0; stats.wins = 0; stats.draws = 0; stats.losses = 0;
          stats.goalsFor = 0; stats.goalsAgainst = 0; stats.goalDifference = 0; stats.points = 0;
      });
      group.matches = generateFixturesForGroup(group.teams);

      if (eventStartTime && typeof matchDurationInMinutes === 'number' && typeof restTimeInMinutes === 'number') {
          const courtNextAvailableTime: string[] = Array(numberOfCourts).fill(eventStartTime);
          const totalTimeForSlot = matchDurationInMinutes + restTimeInMinutes;

          group.matches.forEach(match => {
              let earliestCourtIndex = 0;
              for (let i = 1; i < courtNextAvailableTime.length; i++) {
                  if (courtNextAvailableTime[i] < courtNextAvailableTime[earliestCourtIndex]) {
                      earliestCourtIndex = i;
                  }
              }
              match.startTime = courtNextAvailableTime[earliestCourtIndex];
              match.court = earliestCourtIndex + 1;
              courtNextAvailableTime[earliestCourtIndex] = addMinutesToTime(match.startTime, totalTimeForSlot);
          });
           group.matches.sort((a, b) => {
                if(a.startTime && b.startTime) return a.startTime.localeCompare(b.startTime);
                return (a.court || 0) - (b.court || 0);
            });
      }
      group.teams.sort((a, b) => a.team.name.localeCompare(b.team.name, 'ja'));
  });

  return newCompetition;
};

const recalculateAllStatsForGroup = (group: LeagueGroup): LeagueGroup => {
    if (!group || !Array.isArray(group.matches)) {
        if(group) group.matches = [];
        return group; 
    }
    
    group.teams.forEach(ts => {
        ts.played = 0; ts.wins = 0; ts.draws = 0; ts.losses = 0;
        ts.goalsFor = 0; ts.goalsAgainst = 0; ts.goalDifference = 0; ts.points = 0;
    });

    group.matches.forEach(match => {
        if (!match.played || typeof match.team1Score !== 'number' || typeof match.team2Score !== 'number') return;

        const team1Stats = group.teams.find(t => t.team.id === match.team1Id);
        const team2Stats = group.teams.find(t => t.team.id === match.team2Id);

        if (!team1Stats || !team2Stats) return;

        team1Stats.played++; team2Stats.played++;
        team1Stats.goalsFor += match.team1Score; team1Stats.goalsAgainst += match.team2Score;
        team2Stats.goalsFor += match.team2Score; team2Stats.goalsAgainst += match.team1Score;
        team1Stats.goalDifference = team1Stats.goalsFor - team1Stats.goalsAgainst;
        team2Stats.goalDifference = team2Stats.goalsFor - team2Stats.goalsAgainst;
        
        let t1Points = 0, t2Points = 0;
        if (match.team1Score > match.team2Score) { team1Stats.wins++; t1Points=3; team2Stats.losses++; } 
        else if (match.team2Score > match.team1Score) { team2Stats.wins++; t2Points=3; team1Stats.losses++; } 
        else {
            if (match.winnerId) {
                if (match.winnerId === team1Stats.team.id) { team1Stats.wins++; t1Points=2; team2Stats.losses++; t2Points=1; } 
                else { team2Stats.wins++; t2Points=2; team1Stats.losses++; t1Points=1; }
            } else { team1Stats.draws++; team2Stats.draws++; t1Points=1; t2Points=1; }
        }
        team1Stats.points += t1Points;
        team2Stats.points += t2Points;
    });

    return group;
}

export const updateLeagueStatsAfterMatch = (
    group: LeagueGroup,
    updatedMatch: LeagueMatch
): LeagueGroup | null => {
    if (!group || !updatedMatch) return null;

    const newGroup: LeagueGroup = deepClone(group);
    if (!Array.isArray(newGroup.matches)) newGroup.matches = [];

    const matchIndex = newGroup.matches.findIndex(m => m.id === updatedMatch.id);
    if (matchIndex === -1) return null;
    
    newGroup.matches[matchIndex] = updatedMatch;
    
    return recalculateAllStatsForGroup(newGroup);
};
