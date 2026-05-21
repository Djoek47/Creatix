import { OpenReelEditorLoader } from '@/components/openreel/openreel-editor-loader'

export const metadata = {
  title: 'Creatix Editor (Beta) · Circe et Venus',
  description: 'Creatix editor workspace — trim, export, Ariadne trace.',
}

export default function EditorPage() {
  return <OpenReelEditorLoader />
}
