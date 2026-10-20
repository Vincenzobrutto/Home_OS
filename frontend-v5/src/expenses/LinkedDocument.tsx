import { Link } from 'react-router';
import { useDocument } from '../documents/hooks';
import { documentDisplayTitle } from '../documents/presentation';

/** Reads only the linked, authorized document, using the account-scoped query cache. */
export function LinkedDocument({ homeId, document }: { homeId: string; document: { id: string; name: string } }) {
  const query = useDocument(homeId, document.id);
  const title = query.data && !query.isError
    ? documentDisplayTitle(query.data)
    : documentDisplayTitle({ name: document.name });
  return <Link to={`/home/${encodeURIComponent(homeId)}/documenti/${encodeURIComponent(document.id)}`}>{title}</Link>;
}
