import type { VisualSpec } from '../domain/visuals.ts';

type TitleCard = Extract<VisualSpec, { type: 'title-card' }>;
/** Text only. Legacy HTTP scripts retain their exact existing decoration. */
export function titleCardCopy(card?: TitleCard) {
  return (
    card?.content ?? {
      label: 'HTTP / ONE REQUEST',
      rows:
        card?.variant === 'summary'
          ? [
              'Request: what do you want?',
              'Process: choose what to return',
              'Response: send the result',
            ]
          : [
              '01   A browser asks',
              '02   A server processes',
              '03   A response returns',
            ],
      footnote: 'Illustrative HTTP flow / transport and security omitted',
    }
  );
}
