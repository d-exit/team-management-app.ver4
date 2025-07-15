// src/App.tsx
import React, { useCallback, useMemo, useState } from 'react';
import ChatPage from '@/components/ChatPage';
import ChatScreen from '@/components/ChatScreen';
import FollowedTeamsPage from '@/components/FollowedTeamsPage';
import MatchesPage from '@/components/MatchesPage';
import MatchmakingPage from '@/components/MatchmakingPage';
import SchedulePage from '@/components/SchedulePage';
import TeamManagementPage from '@/components/TeamManagementPage';
import TeamProfilePage from '@/components/TeamProfilePage';
import TeamSelectionPage from '@/components/TeamSelectionPage';
import TournamentGuidelinesPage from '@/components/TournamentGuidelinesPage';
import VenueBookingPage from '@/components/VenueBookingPage';
import {
  mockChatMessages,
  mockChatThreads,
  mockMatches,
  mockPastMatchResults,
  mockScheduleEvents,
  mockTeams,
  mockVenues
} from './data/mockData';
import {
  ChatMessage,
  ChatThread,
  FollowedTeam,
  Match,
  ScheduleEvent,
  Team,
  TeamLevel,
  TournamentInfoFormData,
  Venue,
  View
} from './types';

const App: React.FC = () => {
  // ========== State ==========
  const [currentView, setCurrentView] = useState<View>(View.TEAM_MANAGEMENT);
  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null);
  const [teams, setTeams] = useState<Team[]>(mockTeams);

  // managedTeams は必ず team-1 を含む想定なので初期フィルタ
  const [managedTeams, setManagedTeams] = useState<Team[]>(() =>
    mockTeams.filter(t => t.id === 'team-1')
  );
  // id を string | undefined に変更
  const [selectedManagedTeamId, setSelectedManagedTeamId] = useState<string | undefined>(undefined);
  const selectedManagedTeam = useMemo(
    () => managedTeams.find(t => t.id === selectedManagedTeamId),
    [managedTeams, selectedManagedTeamId]
  );

  const [matches, setMatches] = useState<Match[]>(mockMatches);
  const [venues] = useState<Venue[]>(mockVenues);
  const [scheduleEvents, setScheduleEvents] = useState<ScheduleEvent[]>(mockScheduleEvents);

  const [followedTeams, setFollowedTeams] = useState<FollowedTeam[]>(() =>
    mockTeams
      .filter(t => t.id !== 'team-1')
      .slice(0, 3)
      .map(t => ({ ...t, isFavorite: Math.random() > 0.5, logoUrl: t.logoUrl }))
  );

  const [chatThreads, setChatThreads] = useState<ChatThread[]>(mockChatThreads);
  const [chatMessages, setChatMessages] = useState<Record<string, ChatMessage[]>>(mockChatMessages);
  const [selectedChatThreadId, setSelectedChatThreadId] = useState<string | null>(null);
  const [selectedMatchIdForGuideline, setSelectedMatchIdForGuideline] = useState<string | null>(null);

  const currentUserId = selectedManagedTeam?.id || 'user-self';

  // ========== Handlers ==========
  const handleUpdateMatches = useCallback(
    (updater: React.SetStateAction<Match[]>) => {
      setMatches(updater);
    },
    []
  );

  const handleUpdateTeams = useCallback(
    (updater: React.SetStateAction<Team[]>) => {
      setTeams(prev => {
        const updated = typeof updater === 'function' ? updater(prev) : updater;
        setManagedTeams(mt => mt.map(t => updated.find(u => u.id === t.id) || t));
        return updated;
      });
    },
    []
  );

  const handleUpdateGuidelineForMatch = useCallback(
    (matchId: string, data: TournamentInfoFormData) => {
      setMatches(prev =>
        prev.map(m =>
          m.id === matchId
            ? {
                ...m,
                detailedTournamentInfo: data,
                location: data.eventName,
                // date/time を string | undefined に合わせる
                date: data.eventDateTime.eventDate ?? undefined,
                time: data.eventDateTime.startTime ?? undefined
              }
            : m
        )
      );
      alert('大会要項が更新されました。');
    },
    []
  );

  const handleSaveNewGuidelineAsNewMatch = useCallback((newMatch: Match) => {
    setMatches(prev =>
      [newMatch, ...prev].sort((a, b) => b.date.localeCompare(a.date))
    );
    alert('大会要項が新しい試合として保存されました。');
  }, []);

  const handleSelectTeam = useCallback((team: Team) => {
    setSelectedTeam(team);
    setCurrentView(View.TEAM_PROFILE);
  }, []);

  const handleSelectManagedTeam = (id: string) => {
    setSelectedManagedTeamId(id);
    setCurrentView(View.TEAM_MANAGEMENT);
  };

  const handleCreateTeam = (name: string, coach: string) => {
    const newTeam: Team = {
      id: `team-${Date.now()}`,
      name,
      coachName: coach,
      logoUrl: `https://picsum.photos/seed/${Date.now()}/200/200`,
      level: TeamLevel.BEGINNER,
      rating: 1200,
      rank: 0,
      members: [],
      description: '新しいチームです。よろしくお願いします！',
      prefecture: '',
      city: '',
      ageCategory: '一般'
    };
    setManagedTeams(prev => [...prev, newTeam]);
    setTeams(prev => [...prev, newTeam]);
  };

  const handleDeleteTeam = (teamId: string) => {
    if (confirm('このチームを本当に削除しますか？')) {
      setManagedTeams(prev => prev.filter(t => t.id !== teamId));
    }
  };

  const handleBackToTeamSelection = () => {
    setSelectedManagedTeamId(undefined);
  };

  const handleEditGuidelineForMatch = (matchId: string) => {
    setSelectedMatchIdForGuideline(matchId);
    navigateTo(View.TOURNAMENT_GUIDELINES);
  };

  const navigateTo = (view: View) => {
    if (view !== View.TEAM_PROFILE) setSelectedTeam(null);
    if (view !== View.CHAT_SCREEN) setSelectedChatThreadId(null);
    if (view !== View.TOURNAMENT_GUIDELINES) setSelectedMatchIdForGuideline(null);
    setCurrentView(view);
  };

  const navigateToChatScreen = (threadId: string) => {
    setSelectedChatThreadId(threadId);
    setCurrentView(View.CHAT_SCREEN);
  };

  const handleAddChatThread = (
    thread: ChatThread,
    initial?: ChatMessage,
    nav: boolean = true
  ) => {
    setChatThreads(prev =>
      [thread, ...prev].sort(
        (a, b) => (b.lastMessage?.timestamp.getTime() || 0) - (a.lastMessage?.timestamp.getTime() || 0)
      )
    );
    if (initial) setChatMessages(prev => ({ ...prev, [thread.id]: [initial] }));
    if (nav) navigateToChatScreen(thread.id);
  };

  const handleSendMessage = (threadId: string, msg: ChatMessage) => {
    setChatMessages(prev => ({ ...prev, [threadId]: [...(prev[threadId] || []), msg] }));
    setChatThreads(prev =>
      prev
        .map(t =>
          t.id === threadId
            ? {
                ...t,
                lastMessage: msg,
                unreadCount: msg.senderId === currentUserId ? t.unreadCount : (t.unreadCount || 0) + 1
              }
            : t
        )
        .sort(
          (a, b) =>
            (b.lastMessage?.timestamp.getTime() || 0) - (a.lastMessage?.timestamp.getTime() || 0)
        )
    );
  };

  // ========== UI Components ==========
  const NavButton: React.FC<{
    view: View;
    label: string;
    current: View;
    onClick: (v: View) => void;
  }> = ({ view, label, current, onClick }) => (
    <button
      onClick={() => onClick(view)}
      className={`px-3 py-2 rounded-md font-medium transition ${
        current === view
          ? 'bg-sky-500 text-white'
          : 'bg-slate-700 text-sky-300 hover:bg-slate-600'
      }`}
    >
      {label}
    </button>
  );

  const currentThread = selectedChatThreadId
    ? chatThreads.find(t => t.id === selectedChatThreadId) || null
    : null;
  const messagesForThread = selectedChatThreadId
    ? chatMessages[selectedChatThreadId] || []
    : [];

  // ========== Render ==========
  // 選択中の管理チームがない場合はチーム選択へ
  if (!selectedManagedTeam) {
    return (
      <TeamSelectionPage
        teams={managedTeams}
        onSelectTeam={handleSelectManagedTeam}
        onCreateTeam={handleCreateTeam}
        onDeleteTeam={handleDeleteTeam}
      />
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-700 text-white p-4">
      <header className="text-center mb-6">
        <h1 className="text-3xl font-bold">{selectedManagedTeam.name}</h1>
        <button onClick={handleBackToTeamSelection} className="mt-2 text-sm text-sky-300">
          &larr; チームを選び直す
        </button>
      </header>

      <nav className="flex gap-2 justify-center mb-6">
        <NavButton view={View.TEAM_MANAGEMENT} label="管理" current={currentView} onClick={navigateTo} />
        <NavButton view={View.FOLLOWED_TEAMS} label="フォロー" current={currentView} onClick={navigateTo} />
        <NavButton view={View.MATCHES} label="試合" current={currentView} onClick={navigateTo} />
        <NavButton
          view={View.TOURNAMENT_GUIDELINES}
          label="要項"
          current={currentView}
          onClick={navigateTo}
        />
        <NavButton view={View.SCHEDULE} label="スケジュール" current={currentView} onClick={navigateTo} />
        <NavButton
          view={View.MATCHMAKING}
          label="マッチング"
          current={currentView}
          onClick={navigateTo}
        />
        <NavButton view={View.CHAT_LIST} label="チャット" current={currentView} onClick={navigateTo} />
      </nav>

      <main className="container mx-auto">
        {currentView === View.TEAM_MANAGEMENT && (
          <TeamManagementPage
            team={selectedManagedTeam}
            onUpdateTeam={t => {
              setManagedTeams(prev => prev.map(x => (x.id === t.id ? t : x)));
              setTeams(prev => prev.map(x => (x.id === t.id ? t : x)));
            }}
            pastMatchResults={mockPastMatchResults}
            allTeams={teams}
            matches={matches.filter(
              m => m.ourTeamId === selectedManagedTeam.id || m.participants?.some(p => p.teamId === selectedManagedTeam.id)
            )}
          />
        )}

        {currentView === View.FOLLOWED_TEAMS && (
          <FollowedTeamsPage
            followedTeams={followedTeams}
            onSelectTeam={handleSelectTeam}
            onToggleFavorite={id =>
              setFollowedTeams(prev =>
                prev.map(ft => (ft.id === id ? { ...ft, isFavorite: !ft.isFavorite } : ft))
              )
            }
            onUnfollow={team => setFollowedTeams(prev => prev.filter(ft => ft.id !== team.id))}
            allTeams={teams}
            managedTeamId={selectedManagedTeam.id}
          />
        )}

        {currentView === View.MATCHES && (
          <MatchesPage
            matches={matches}
            teams={teams}
            onUpdateMatches={handleUpdateMatches}
            managedTeam={selectedManagedTeam}
            followedTeams={followedTeams}
            chatThreads={chatThreads}
            onAddChatThread={handleAddChatThread}
            onSendMessage={handleSendMessage}
            onUpdateTeams={handleUpdateTeams}
            onEditGuideline={handleEditGuidelineForMatch}
          />
        )}

        {currentView === View.TOURNAMENT_GUIDELINES && (
          <TournamentGuidelinesPage
            allMatches={matches}
            selectedMatchId={selectedMatchIdForGuideline!}
            managedTeam={selectedManagedTeam}
            onSaveGuidelineAsNewMatch={handleSaveNewGuidelineAsNewMatch}
            onUpdateGuidelineForMatch={handleUpdateGuidelineForMatch}
            chatThreads={chatThreads}
            onSendMessage={handleSendMessage}
            teams={teams}
          />
        )}

        {currentView === View.SCHEDULE && (
          <SchedulePage
            events={scheduleEvents.filter(e => e.teamId === selectedManagedTeam.id)}
            teamId={selectedManagedTeam.id}
            onUpdateEvents={setScheduleEvents}
          />
        )}

        {currentView === View.MATCHMAKING && (
          <MatchmakingPage
            allTeams={teams.filter(t => t.id !== selectedManagedTeam.id)}
            onFollowTeam={team =>
              setFollowedTeams(prev => [...prev, { ...team, isFavorite: false, logoUrl: team.logoUrl }])
            }
            followedTeamIds={followedTeams.map(ft => ft.id)}
            onSelectTeam={handleSelectTeam}
          />
        )}

        {currentView === View.CHAT_LIST && (
          <ChatPage
            threads={chatThreads}
            currentUserId={currentUserId}
            currentUserTeamName={selectedManagedTeam.name}
            followedTeams={followedTeams.map(ft => {
              const real = teams.find(t => t.id === ft.id);
              return { ...ft, logoUrl: real?.logoUrl || ft.logoUrl };
            })}
            onAddChatThread={handleAddChatThread}
            onViewChatScreen={navigateToChatScreen}
            teams={teams}
          />
        )}

        {currentView === View.CHAT_SCREEN && currentThread && (
          <ChatScreen
            thread={currentThread}
            messages={messagesForThread}
            currentUserId={currentUserId}
            currentUserTeamName={selectedManagedTeam.name}
            teams={teams}
            onSendMessage={handleSendMessage}
            onBackToList={() => navigateTo(View.CHAT_LIST)}
          />
        )}
      </main>
    </div>
  );
};

export default App;
