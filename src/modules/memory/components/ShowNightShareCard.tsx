import type { ShowNightShareCardModel, ShowNightShareTemplateId } from '../showNightShareCardLogic';
import { ShowNightShareBoletoTemplate } from './showNightShare/ShowNightShareBoletoTemplate';
import { ShowNightSharePosterTemplate } from './showNightShare/ShowNightSharePosterTemplate';
import { ShowNightShareSetlistTemplate } from './showNightShare/ShowNightShareSetlistTemplate';

type ShowNightShareCardProps = {
  model: ShowNightShareCardModel;
  template: ShowNightShareTemplateId;
  onVisualReady?: () => void;
};

export function ShowNightShareCard({ model, template, onVisualReady }: ShowNightShareCardProps) {
  switch (template) {
    case 'setlist':
      return <ShowNightShareSetlistTemplate model={model} onVisualReady={onVisualReady} />;
    case 'poster':
      return <ShowNightSharePosterTemplate model={model} onVisualReady={onVisualReady} />;
    case 'boleto':
    default:
      return <ShowNightShareBoletoTemplate model={model} onVisualReady={onVisualReady} />;
  }
}
