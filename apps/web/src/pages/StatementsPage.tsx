import { useStatements } from '../hooks/useStatements';
import { StatementsView } from '../views/StatementsView';

export function StatementsPage() {
  const statementsData = useStatements();
  return <StatementsView {...statementsData} />;
}
