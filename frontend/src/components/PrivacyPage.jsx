export default function PrivacyPage() {
  return (
    <div style={{
      maxWidth: 720, margin: '0 auto', padding: '48px 20px 64px',
      color: 'var(--text-primary)', fontFamily: 'system-ui, sans-serif',
      lineHeight: 1.7,
    }}>
      <h1 style={{ fontSize: 28, fontWeight: 700, marginBottom: 4 }}>Privacy Policy</h1>
      <p style={{ color: 'var(--text-muted)', fontSize: 13, marginBottom: 40 }}>
        隐私政策 · Last updated: October 2026
      </p>

      <Section title="1. Overview">
        BFStock is an educational tool for learning about stock markets and economics. We are committed to protecting your privacy. This policy explains what data we collect, why, and how it is used.
      </Section>

      <Section title="2. Data We Collect">
        <ul style={{ paddingLeft: 20, margin: 0 }}>
          <li style={{ marginBottom: 8 }}><strong>Device Identifier:</strong> A random UUID is generated on first launch and stored in your device's Keychain. It is never linked to your name, email, or any personal identity. It is used solely to associate your paper-trading account and AI conversation history with your device.</li>
          <li style={{ marginBottom: 8 }}><strong>AI Conversation Messages:</strong> When you use the AI Teacher feature, your messages and conversation history are sent to our server and forwarded to a third-party AI provider (DeepSeek) to generate responses. Messages are not stored permanently beyond your session.</li>
          <li style={{ marginBottom: 8 }}><strong>Paper Trading Activity:</strong> Buy/sell orders and account balances are stored on our server, keyed only to your anonymous device identifier. No real money is involved.</li>
          <li><strong>Market Data Queries:</strong> Stock symbols you view are sent to our server to fetch price data. These are not linked to your identity.</li>
        </ul>
      </Section>

      <Section title="3. Data We Do NOT Collect">
        We do not collect your name, email address, phone number, location, contacts, photos, or any other personal identifiers. We do not use advertising SDKs or tracking frameworks.
      </Section>

      <Section title="4. Third-Party Services">
        <ul style={{ paddingLeft: 20, margin: 0 }}>
          <li style={{ marginBottom: 8 }}><strong>DeepSeek:</strong> AI Teacher messages are processed by DeepSeek's API. Please refer to DeepSeek's privacy policy for how they handle API request data.</li>
          <li><strong>Market data providers:</strong> Stock price data is fetched server-side; your device communicates only with our own server.</li>
        </ul>
      </Section>

      <Section title="5. Data Retention & Deletion">
        Your paper-trading account and AI conversation history stored on our servers can be deleted at any time by tapping "Reset Account" in the Paper Trading tab, which permanently erases all server-side data associated with your device identifier. You may also contact us to request deletion.
      </Section>

      <Section title="6. Children">
        The App is designed for educational use. We do not knowingly collect any data from children under 13 beyond the anonymous device identifier described above.
      </Section>

      <Section title="7. Changes">
        We may update this policy from time to time. The "Last updated" date at the top reflects the most recent revision.
      </Section>

      <Section title="8. Contact">
        Questions? Email us at{' '}
        <a href="mailto:billyl090119@gmail.com" style={{ color: '#38bdf8' }}>
          billyl090119@gmail.com
        </a>
      </Section>

      <hr style={{ borderColor: '#334155', margin: '40px 0' }} />

      <h2 style={{ fontSize: 20, fontWeight: 600, marginBottom: 24 }}>中文版</h2>

      <Section title="1. 概述">
        BFStock 是一款用于学习股票市场和经济学的教育工具。我们致力于保护您的隐私。本政策说明我们收集哪些数据、原因及使用方式。
      </Section>

      <Section title="2. 我们收集的数据">
        <ul style={{ paddingLeft: 20, margin: 0 }}>
          <li style={{ marginBottom: 8 }}><strong>设备标识符：</strong>首次启动时生成一个随机 UUID，存储在设备的 Keychain 中。该标识符不与姓名、邮箱或任何个人身份关联，仅用于将模拟盘账户和 AI 对话历史与您的设备关联。</li>
          <li style={{ marginBottom: 8 }}><strong>AI 对话消息：</strong>使用 AI 老师功能时，消息和对话历史将发送至服务器并转发给第三方 AI 服务商（DeepSeek）以生成回复，不会超出会话期间永久存储。</li>
          <li style={{ marginBottom: 8 }}><strong>模拟交易记录：</strong>买卖订单和账户余额存储在服务器上，仅与匿名设备标识符关联，不涉及真实资金。</li>
          <li><strong>行情查询：</strong>您查看的股票代码会发送至服务器以获取价格数据，不与身份关联。</li>
        </ul>
      </Section>

      <Section title="3. 我们不收集的数据">
        我们不收集姓名、邮箱、电话、位置、通讯录、照片或任何其他个人标识符，也不使用广告 SDK 或追踪框架。
      </Section>

      <Section title="4. 第三方服务">
        <ul style={{ paddingLeft: 20, margin: 0 }}>
          <li style={{ marginBottom: 8 }}><strong>DeepSeek：</strong>AI 老师消息由 DeepSeek API 处理，请参阅 DeepSeek 的隐私政策了解其数据处理方式。</li>
          <li><strong>行情数据：</strong>股票价格数据在服务器端获取，您的设备仅与我们自己的服务器通信。</li>
        </ul>
      </Section>

      <Section title="5. 数据保留与删除">
        您可随时在"模拟盘"页面点击"重置账户"，永久删除服务器上与您设备标识符关联的所有数据。也可通过邮件联系我们请求删除。
      </Section>

      <Section title="6. 儿童隐私">
        本应用面向教育用途。除上述匿名设备标识符外，我们不会有意收集 13 岁以下儿童的任何数据。
      </Section>

      <Section title="7. 政策变更">
        我们可能不时更新本政策，顶部"最后更新"日期反映最新修订。
      </Section>

      <Section title="8. 联系我们">
        如有疑问，请发送邮件至{' '}
        <a href="mailto:billyl090119@gmail.com" style={{ color: '#38bdf8' }}>
          billyl090119@gmail.com
        </a>
      </Section>
    </div>
  )
}

function Section({ title, children }) {
  return (
    <div style={{ marginBottom: 28 }}>
      <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 8, color: 'var(--text-primary)' }}>{title}</h3>
      <div style={{ fontSize: 14, color: 'var(--text-secondary)' }}>{children}</div>
    </div>
  )
}
