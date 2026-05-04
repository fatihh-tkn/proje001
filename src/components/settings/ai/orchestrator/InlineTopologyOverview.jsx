/**
 * InlineTopologyOverview — geçmişte klasik User → Prompt → Chat → Msg → Action
 * akışını çiziyordu. LangGraph multi-agent pipeline birincil yol haline geldikten
 * sonra (LG.6 sprint sonrası) klasik topoloji görseli kaldırıldı.
 *
 * Bu dosya artık sadece backwards-compat amaçlı bir shim — `AiOrchestratorViewer`
 * içinden hâlâ bu adla import ediliyor; render'ı GraphTopologyOverview'a yönlendiriyor.
 */
import GraphTopologyOverview from './GraphTopologyOverview';

const InlineTopologyOverview = ({ allAgents, rags, onOpenPayload, onToggleAgent }) => (
    <GraphTopologyOverview
        allAgents={allAgents}
        rags={rags}
        onOpenPayload={onOpenPayload}
        onToggleAgent={onToggleAgent}
    />
);

export default InlineTopologyOverview;
