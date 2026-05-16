import Link from 'next/link'

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 text-center">
      <div className="text-6xl">🐂</div>
      <h1 className="text-2xl font-bold text-gray-100">页面未找到</h1>
      <p className="text-gray-400">您访问的页面不存在</p>
      <Link
        href="/"
        className="mt-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-sm font-medium transition-colors"
      >
        返回首页
      </Link>
    </div>
  )
}
