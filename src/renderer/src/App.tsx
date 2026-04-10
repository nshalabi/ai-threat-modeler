import { useEffect } from 'react'
import { AppLayout } from './components/Layout/AppLayout'
import { useProjectStore } from './stores/project-store'

function App(): JSX.Element {
  const project = useProjectStore((s) => s.project)
  const newProject = useProjectStore((s) => s.newProject)

  useEffect(() => {
    if (!project.nodes.length && project.name === 'Untitled Project') {
      newProject('Untitled Project', 'New AI threat model project')
    }
  }, [])

  return <AppLayout />
}

export default App
