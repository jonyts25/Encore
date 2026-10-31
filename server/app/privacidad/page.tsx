import { PrivacyNoticePage } from '@/components/PrivacyNoticePage';
import { getPrivacyDocument } from '@/lib/privacyNoticeContent';

export const dynamic = 'force-static';

export default function PrivacidadPage() {
  return <PrivacyNoticePage doc={getPrivacyDocument('es')} />;
}
