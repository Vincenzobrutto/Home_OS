import { useSearchParams } from 'react-router';
import { DocumentEditorWorkspace } from '../documents/DocumentEditorWorkspace';
import { useCurrentHome } from '../routes/HomePages';
import { useAccount } from '../session/session';
import { IntakeContent, type IntakeContentProps } from './IntakeContent';

/** Route entry point: the workspace embeds content directly, never this route selector. */
export function IntakePage(props: IntakeContentProps = {}) {
  const home = useCurrentHome(), account = useAccount(), [params] = useSearchParams();
  if (!props.workspace && params.has('oggetti-documento')) {
    return <DocumentEditorWorkspace key={account.id + ':' + home.id} />;
  }
  return <IntakeContent {...props} />;
}
