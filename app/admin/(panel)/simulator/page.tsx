import { AdminCostSimulatorGame } from '@/components/admin/cost-simulator-game'
import { getHybridCreditModel } from '@/lib/admin/hybrid-credit-model'

export default function AdminSimulatorPage() {
  const model = getHybridCreditModel()
  return (
    <AdminCostSimulatorGame
      hybridBaseUsdPerCredit={model.baseUsdPerCredit}
      hybridOverrideCount={Object.keys(model.featureOverrides).length}
    />
  )
}
