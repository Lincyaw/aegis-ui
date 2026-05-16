import {
  Avatar,
  Chip,
  MetricLabel,
  PageHeader,
  Panel,
  PanelTitle,
} from '@lincyaw/aegis-ui';
import { Button } from 'antd';

import './Teams.css';

interface Team {
  id: string;
  name: string;
  description: string;
  members: string[];
  totalMembers: number;
  projects: number;
}

const MOCK_TEAMS: Team[] = [
  {
    id: 't-platform',
    name: 'Platform Team',
    description: 'Owns shared infrastructure, CI, and the developer console.',
    members: [
      'Grace Hopper',
      'Linus Torvalds',
      'Ada Lovelace',
      'Alan Turing',
      'Margaret Hamilton',
      'Tim Berners-Lee',
      'Edsger Dijkstra',
    ],
    totalMembers: 12,
    projects: 5,
  },
  {
    id: 't-sre',
    name: 'SRE',
    description: 'On-call rotation, reliability, and incident response.',
    members: ['Katherine Johnson', 'Donald Knuth', 'Barbara Liskov'],
    totalMembers: 3,
    projects: 2,
  },
  {
    id: 't-data',
    name: 'Data Science',
    description: 'Dataset curation, labeling, and model evaluation.',
    members: [
      'Ada Lovelace',
      'Margaret Hamilton',
      'Donald Knuth',
      'Barbara Liskov',
      'Katherine Johnson',
      'Tim Berners-Lee',
    ],
    totalMembers: 8,
    projects: 4,
  },
  {
    id: 't-security',
    name: 'Security',
    description: 'Threat modeling, audit reviews, and policy enforcement.',
    members: ['Alan Turing', 'Grace Hopper'],
    totalMembers: 2,
    projects: 1,
  },
  {
    id: 't-frontend',
    name: 'Frontend',
    description: 'Design system, console UX, and customer-facing dashboards.',
    members: [
      'Tim Berners-Lee',
      'Ada Lovelace',
      'Margaret Hamilton',
      'Linus Torvalds',
    ],
    totalMembers: 4,
    projects: 3,
  },
];

const MAX_VISIBLE = 5;

export default function Teams() {
  return (
    <>
      <PageHeader
        title='Teams'
        description='Group members into teams for easier access control.'
        action={<Button type='primary'>+ Create team</Button>}
      />
      <div className='teams-page__list'>
        {MOCK_TEAMS.map((team) => {
          const visible = team.members.slice(0, MAX_VISIBLE);
          const overflow = team.totalMembers - visible.length;
          return (
            <Panel key={team.id}>
              <div className='teams-page__card'>
                <div className='teams-page__head'>
                  <div className='teams-page__head-text'>
                    <PanelTitle size='base' as='h3'>
                      {team.name}
                    </PanelTitle>
                    <MetricLabel>{team.description}</MetricLabel>
                  </div>
                  <Button>Manage</Button>
                </div>
                <div className='teams-page__meta'>
                  <div className='teams-page__avatars'>
                    {visible.map((name) => (
                      <span key={name} className='teams-page__avatar'>
                        <Avatar name={name} size='sm' />
                      </span>
                    ))}
                    {overflow > 0 && <Chip tone='ghost'>+{overflow} more</Chip>}
                  </div>
                  <span className='teams-page__projects'>
                    {team.projects}{' '}
                    {team.projects === 1 ? 'project' : 'projects'}
                  </span>
                </div>
              </div>
            </Panel>
          );
        })}
      </div>
    </>
  );
}
