// LocalStorage 工具类

class Storage {
  /**
   * 获取数据
   */
  get<T = any>(key: string): T | null {
    try {
      const value = localStorage.getItem(key)
      if (value === null) {
        return null
      }
      return JSON.parse(value) as T
    } catch {
      return null
    }
  }

  /**
   * 设置数据
   */
  set(key: string, value: any): void {
    try {
      localStorage.setItem(key, JSON.stringify(value))
    } catch (error) {
      console.error('Storage set error:', error)
    }
  }

  /**
   * 删除数据
   */
  remove(key: string): void {
    localStorage.removeItem(key)
  }

  /**
   * 清空所有数据
   */
  clear(): void {
    localStorage.clear()
  }

  /**
   * 获取所有 key
   */
  keys(): string[] {
    return Object.keys(localStorage)
  }
}

export default new Storage()
