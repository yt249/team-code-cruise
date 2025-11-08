import { renderToString } from 'react-dom/server'

describe('frontend jest + jsx smoke test', () => {
  it('renders simple JSX to string', () => {
    const html = renderToString(<div>Hello Jest</div>)
    expect(html).toContain('Hello Jest')
  })
})