import { PrivacyNoticePage } from '@/components/PrivacyNoticePage';
import { getPrivacyDocument } from '@/lib/privacyNoticeContent';

export const dynamic = 'force-static';

export default function PrivacyPage() {
  return <PrivacyNoticePage doc={getPrivacyDocument('en')} />;
}
