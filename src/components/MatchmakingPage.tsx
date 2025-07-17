// components/MatchmakingPage.tsx
import React, { useState, useMemo } from 'react';
import { Team, TeamLevel, MatchmakingFilters } from '../types';

interface MatchmakingPageProps {
  allTeams: Team[]; // 全チーム
  onFollowTeam: (teamToFollow: Team) => void;
  followedTeamIds: string[];
  onSelectTeam: (team: Team) => void;
}

const prefectures = ['東京都', '大阪府', '福岡県', '北海道', '神奈川県' /* … */];
// TeamLevel の列挙値
const teamLevels = Object.values(TeamLevel) as string[];
// undefined を除いた ageCategory のリテラル型
const ageCategories = ['U-10', 'U-12', 'U-15', '一般'] as const;
type AgeCat = typeof ageCategories[number];

type LocalFilters = {
  prefecture: string[];
  level: string[];
  ageCategory: AgeCat[];
  ratingMin?: number;
  ratingMax?: number;
};

const MatchmakingPage: React.FC<MatchmakingPageProps> = ({
  allTeams,
  onFollowTeam,
  followedTeamIds,
  onSelectTeam,
}) => {
  const [filters, setFilters] = useState<LocalFilters>({
    prefecture: [],
    level: [],
    ageCategory: [],
  });
  const [availableDateFilter, setAvailableDateFilter] = useState('');

  const handleMultiSelectChange = (field: keyof LocalFilters, value: string) => {
    setFilters(prev => {
      const arr = prev[field] || [];
      const next = arr.includes(value)
        ? arr.filter(v => v !== value)
        : [...arr, value];
      return { ...prev, [field]: next };
    });
  };

  const handleRatingChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFilters(prev => ({
      ...prev,
      [name]: value ? parseInt(value, 10) : undefined,
    }));
  };

  const recommendedTeams = useMemo(() => {
    return allTeams.filter(team => {
      const inPref = filters.prefecture.length === 0 || filters.prefecture.includes(team.prefecture ?? '');
      const inLevel = filters.level.length === 0 || filters.level.includes(team.level);
      const inAge = filters.ageCategory.length === 0 || filters.ageCategory.includes((team.ageCategory ?? '一般') as AgeCat);
      const minOk = filters.ratingMin == null || team.rating >= filters.ratingMin;
      const maxOk = filters.ratingMax == null || team.rating <= filters.ratingMax;
      const dateOk = !availableDateFilter
        || team.availableSlotsText === '空き'
        || team.availableSlotsText === '週末のみ空き';
      return inPref && inLevel && inAge && minOk && maxOk && dateOk;
    });
  }, [allTeams, filters, availableDateFilter]);

  const FilterTag: React.FC<{
    label: string;
    value?: string;
    onRemove?: () => void;
    compact?: boolean;
  }> = ({ label, value, onRemove, compact }) => {
    if (!value) return null;
    return (
      <span
        className={`inline-flex items-center ${
          compact ? 'text-xs px-1.5 py-0.5' : 'text-xs sm:text-sm px-2.5 py-1'
        } bg-sky-700 text-sky-200 font-medium rounded-full`}
      >
        {label}: {value}
        {onRemove && (
          <button
            onClick={onRemove}
            className={`ml-1 ${compact ? 'text-xs' : 'text-sm'} text-sky-300 hover:text-sky-100`}
          >
            &times;
          </button>
        )}
      </span>
    );
  };

  return (
    <div className="space-y-6">
      <h2 className="text-2xl sm:text-3xl font-semibold text-sky-300">マッチング検索</h2>

      <div className="bg-slate-800 p-4 sm:p-6 rounded-xl shadow-xl space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          {/* 都道府県 */}
          <div>
            <h4 className="text-sm sm:text-base font-semibold text-slate-300 mb-1.5">
              都道府県
            </h4>
            <div className="space-y-0.5 max-h-28 sm:max-h-32 overflow-y-auto pr-1">
              {prefectures.map(pref => (
                <label
                  key={pref}
                  className="flex items-center space-x-1.5 cursor-pointer text-xs sm:text-sm hover:bg-slate-700 p-0.5 sm:p-1 rounded"
                >
                  <input
                    type="checkbox"
                    checked={filters.prefecture.includes(pref)}
                    onChange={() => handleMultiSelectChange('prefecture', pref)}
                    className="form-checkbox h-3.5 w-3.5 sm:h-4 sm:w-4 bg-slate-600 border-slate-500 text-sky-500 focus:ring-sky-500"
                  />
                  <span>{pref}</span>
                </label>
              ))}
            </div>
          </div>

          {/* レベル */}
          <div>
            <h4 className="text-sm sm:text-base font-semibold text-slate-300 mb-1.5">
              レベル
            </h4>
            <div className="space-y-0.5 max-h-28 sm:max-h-32 overflow-y-auto pr-1">
              {teamLevels.map(lv => (
                <label
                  key={lv}
                  className="flex items-center space-x-1.5 cursor-pointer text-xs sm:text-sm hover:bg-slate-700 p-0.5 sm:p-1 rounded"
                >
                  <input
                    type="checkbox"
                    checked={filters.level.includes(lv)}
                    onChange={() => handleMultiSelectChange('level', lv)}
                    className="form-checkbox h-3.5 w-3.5 sm:h-4 sm:w-4 bg-slate-600 border-slate-500 text-sky-500 focus:ring-sky-500"
                  />
                  <span>{lv}</span>
                </label>
              ))}
            </div>
          </div>

          {/* 年齢カテゴリ */}
          <div>
            <h4 className="text-sm sm:text-base font-semibold text-slate-300 mb-1.5">
              年齢カテゴリ
            </h4>
            <div className="space-y-0.5 max-h-28 sm:max-h-32 overflow-y-auto pr-1">
              {ageCategories.map(age => (
                <label
                  key={age}
                  className="flex items-center space-x-1.5 cursor-pointer text-xs sm:text-sm hover:bg-slate-700 p-0.5 sm:p-1 rounded"
                >
                  <input
                    type="checkbox"
                    checked={filters.ageCategory.includes(age)}
                    onChange={() => handleMultiSelectChange('ageCategory', age)}
                    className="form-checkbox h-3.5 w-3.5 sm:h-4 sm:w-4 bg-slate-600 border-slate-500 text-sky-500 focus:ring-sky-500"
                  />
                  <span>{age}</span>
                </label>
              ))}
            </div>
          </div>

          {/* レーティング */}
          <div className="sm:col-span-2 md:col-span-1">
            <h4 className="text-sm sm:text-base font-semibold text-slate-300 mb-1.5">
              レーティング
            </h4>
            <div className="flex gap-1.5 items-center">
              <input
                type="number"
                name="ratingMin"
                placeholder="最小"
                value={filters.ratingMin ?? ''}
                onChange={handleRatingChange}
                className="w-1/2 bg-slate-700 p-1.5 rounded-md border border-slate-600 text-xs sm:text-sm"
              />
              <span className="text-xs sm:text-sm">～</span>
              <input
                type="number"
                name="ratingMax"
                placeholder="最大"
                value={filters.ratingMax ?? ''}
                onChange={handleRatingChange}
                className="w-1/2 bg-slate-700 p-1.5 rounded-md border border-slate-600 text-xs sm:text-sm"
              />
            </div>
          </div>

          {/* 空き日程 */}
          <div>
            <h4 className="text-sm sm:text-base font-semibold text-slate-300 mb-1.5">
              空き日程
            </h4>
            <input
              type="date"
              value={availableDateFilter}
              onChange={e => setAvailableDateFilter(e.target.value)}
              className="w-full bg-slate-700 p-1.5 rounded-md border border-slate-600 text-slate-400 text-xs sm:text-sm"
            />
            <p className="text-xs text-slate-500 mt-0.5">
              チームの「空き」状況で簡易検索
            </p>
          </div>
        </div>
      </div>

      {/* 選択中フィルター */}
      <div className="my-3 space-x-1.5 space-y-1.5">
        {filters.prefecture.map(p => (
          <FilterTag
            key={p}
            label="県"
            value={p}
            onRemove={() => handleMultiSelectChange('prefecture', p)}
            compact
          />
        ))}
        {filters.level.map(lv => (
          <FilterTag
            key={lv}
            label="Lv"
            value={lv.slice(0, 2)}
            onRemove={() => handleMultiSelectChange('level', lv)}
            compact
          />
        ))}
        {filters.ageCategory.map(ac => (
          <FilterTag
            key={ac}
            label="年"
            value={ac}
            onRemove={() => handleMultiSelectChange('ageCategory', ac)}
            compact
          />
        ))}
        {filters.ratingMin != null && (
          <FilterTag
            label="minR"
            value={String(filters.ratingMin)}
            onRemove={() => setFilters(f => ({ ...f, ratingMin: undefined }))}
            compact
          />
        )}
        {filters.ratingMax != null && (
          <FilterTag
            label="maxR"
            value={String(filters.ratingMax)}
            onRemove={() => setFilters(f => ({ ...f, ratingMax: undefined }))}
            compact
          />
        )}
        {availableDateFilter && (
          <FilterTag
            label="日"
            value={availableDateFilter.slice(5)}
            onRemove={() => setAvailableDateFilter('')}
            compact
          />
        )}
      </div>

      {/* おすすめチーム一覧 */}
      <h3 className="text-xl sm:text-2xl font-semibold text-sky-300 mt-6">
        おすすめチーム ({recommendedTeams.length}件)
      </h3>
      {recommendedTeams.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
          {recommendedTeams.map(team => (
            <div
              key={team.id}
              className="bg-slate-800 rounded-lg shadow-xl overflow-hidden flex flex-col"
            >
              <div
                className="h-20 sm:h-24 w-full overflow-hidden cursor-pointer"
                onClick={() => onSelectTeam(team)}
              >
                <img
                  src={team.logoUrl}
                  alt={`${team.name} ロゴ`}
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="p-2 sm:p-2.5 flex flex-col flex-grow">
                <h4
                  className="text-sm sm:text-base font-semibold text-sky-400 mb-1 truncate cursor-pointer hover:underline"
                  onClick={() => onSelectTeam(team)}
                >
                  {team.name}
                </h4>
                <div className="mb-1.5 sm:mb-2 space-x-1 space-y-1 flex flex-wrap">
                  <FilterTag label="県" value={team.prefecture?.slice(0, 2)} compact />
                  <FilterTag label="Lv" value={team.level.slice(0, 2)} compact />
                  <FilterTag label="年" value={team.ageCategory ?? ''} compact />
                  <FilterTag label="R" value={String(team.rating)} compact />
                  <FilterTag label="空" value={team.availableSlotsText ?? ''} compact />
                </div>
                <button
                  onClick={() => onFollowTeam(team)}
                  disabled={followedTeamIds.includes(team.id)}
                  className={`w-full text-xs font-medium py-2 px-2.5 rounded-md transition mt-auto ${
                    followedTeamIds.includes(team.id)
                      ? 'bg-slate-600 text-slate-400 cursor-not-allowed'
                      : 'bg-green-600 hover:bg-green-700 text-white'
                  }`}
                >
                  {followedTeamIds.includes(team.id) ? 'フォロー済み' : 'フォローする'}
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-center text-slate-400 text-lg sm:text-xl py-8 sm:py-10">
          条件に合うチームが見つかりませんでした。
        </p>
      )}
    </div>
  );
};

export default MatchmakingPage;
