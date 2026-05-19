import { useEffect } from 'react'
import { AppLayout } from './components/Layout/AppLayout'
import { useProjectStore } from './stores/project-store'
import { platform } from './platform'
import { decodeHashToProject } from './utils/share-link'

function App(): JSX.Element {
  const project = useProjectStore((s) => s.project)
  const newProject = useProjectStore((s) => s.newProject)
  const setProject = useProjectStore((s) => s.setProject)

  useEffect(() => {
    // Web: if the URL carries a shared model, load it and clear the hash so
    // a refresh doesn't re-import stale state.
    if (
      platform.kind === 'web' &&
      typeof window !== 'undefined' &&
      /[#&]m=/.test(window.location.hash)
    ) {
      const result = decodeHashToProject(window.location.hash)
      window.history.replaceState(
        null,
        '',
        window.location.pathname + window.location.search
      )
      if (result.ok) {
        setProject(result.project)
        return
      }
      console.error('Shared link could not be opened:', result.error)
    }

    if (!project.nodes.length && project.name === 'Untitled Project') {
      newProject('Untitled Project', 'New AI threat model project')
    }
  }, [])

  return <AppLayout />
}

export default App
