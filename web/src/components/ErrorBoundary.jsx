import { Component } from 'react'

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, retryCount: 0 }
  }

  static getDerivedStateFromError() {
    return { hasError: true }
  }

  componentDidCatch(error, info) {
    console.error('渲染出错，自动重试:', error)
    // 自动重试，不显示错误
    if (this.state.retryCount < 3) {
      setTimeout(() => {
        this.setState(prev => ({ hasError: false, retryCount: prev.retryCount + 1 }))
      }, 100)
    }
  }

  render() {
    if (this.state.hasError && this.state.retryCount >= 3) {
      // 最终降级：静默重置
      setTimeout(() => this.setState({ hasError: false, retryCount: 0 }), 500)
      return null
    }
    if (this.state.hasError) return null
    return this.props.children
  }
}
