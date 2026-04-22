import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

type Props = {
  contentType: string
  setContentType: (v: string) => void
  currentPrice: string
  setCurrentPrice: (v: string) => void
  niche: string
  setNiche: (v: string) => void
  fanMessage: string
  setFanMessage: (v: string) => void
}

export function PricingOptimizerInputsEasy({
  contentType,
  setContentType,
  currentPrice,
  setCurrentPrice,
  niche,
  setNiche,
}: Props) {
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>What are you pricing?</Label>
        <Select value={contentType} onValueChange={setContentType}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="photo">Photos / sets</SelectItem>
            <SelectItem value="video">Videos</SelectItem>
            <SelectItem value="ppv">PPV bundles</SelectItem>
            <SelectItem value="subscription">Subscription</SelectItem>
            <SelectItem value="custom">Custom / other</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <Label>Current price (if any)</Label>
        <Input placeholder="e.g. 15 or 15–25" value={currentPrice} onChange={(e) => setCurrentPrice(e.target.value)} />
      </div>
      <div className="space-y-2">
        <Label>Niche</Label>
        <Input placeholder="e.g. GFE, fitness…" value={niche} onChange={(e) => setNiche(e.target.value)} />
      </div>
    </div>
  )
}

export function PricingOptimizerInputsPro({
  contentType,
  setContentType,
  currentPrice,
  setCurrentPrice,
  niche,
  setNiche,
  fanMessage,
  setFanMessage,
}: Props) {
  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label>Content type</Label>
          <Select value={contentType} onValueChange={setContentType}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="photo">Photos / sets</SelectItem>
              <SelectItem value="video">Videos</SelectItem>
              <SelectItem value="ppv">PPV bundles</SelectItem>
              <SelectItem value="subscription">Subscription</SelectItem>
              <SelectItem value="custom">Custom / other</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Current price</Label>
          <Input
            placeholder="e.g. 12, or a range"
            value={currentPrice}
            onChange={(e) => setCurrentPrice(e.target.value)}
          />
        </div>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label>Niche</Label>
          <Input placeholder="e.g. cosplay, domme…" value={niche} onChange={(e) => setNiche(e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label>Subscriber count hint (optional)</Label>
          <Input
            placeholder="Rough count or tier"
            value={fanMessage}
            onChange={(e) => setFanMessage(e.target.value)}
          />
        </div>
      </div>
    </div>
  )
}
