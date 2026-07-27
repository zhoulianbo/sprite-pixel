import { Tab } from '@/shared/types/blocks/common';

export interface Setting {
  name: string;
  title: string;
  type: string;
  placeholder?: string;
  options?: {
    title: string;
    value: string;
  }[];
  tip?: string;
  value?: string | string[] | boolean | number;
  group?: string;
  tab?: string;
  attributes?: Record<string, any>;
}

export interface SettingGroup {
  name: string;
  title: string;
  description?: string;
  tab: string;
}

export async function getSettingTabs(tab: string) {
  const tabs: Tab[] = [
    {
      name: 'general',
      title: '通用',
      url: '/admin/settings/general',
      is_active: tab === 'general',
    },
    {
      name: 'auth',
      title: '认证',
      url: '/admin/settings/auth',
      is_active: tab === 'auth',
    },
    {
      name: 'payment',
      title: '支付',
      url: '/admin/settings/payment',
      is_active: tab === 'payment',
    },
    {
      name: 'email',
      title: '邮箱',
      url: '/admin/settings/email',
      is_active: tab === 'email',
    },
    {
      name: 'storage',
      title: '存储',
      url: '/admin/settings/storage',
      is_active: tab === 'storage',
    },

    {
      name: 'ai',
      title: 'AI',
      url: '/admin/settings/ai',
      is_active: tab === 'ai',
    },
    {
      name: 'analytics',
      title: '数据分析',
      url: '/admin/settings/analytics',
      is_active: tab === 'analytics',
    },
    {
      name: 'ads',
      title: '广告',
      url: '/admin/settings/ads',
      is_active: tab === 'ads',
    },
    {
      name: 'affiliate',
      title: '联盟营销',
      url: '/admin/settings/affiliate',
      is_active: tab === 'affiliate',
    },
    {
      name: 'customer_service',
      title: '客户服务',
      url: '/admin/settings/customer_service',
      is_active: tab === 'customer_service',
    },
  ];

  return tabs;
}

export async function getSettingGroups() {
  const settingGroups: SettingGroup[] = [
    {
      name: 'appinfo',
      title: '应用信息',
      description: '配置应用名称、描述、Logo 和预览图',
      tab: 'general',
    },
    {
      name: 'user_role',
      title: '用户角色',
      description: '配置新用户注册后的默认角色',
      tab: 'general',
    },
    {
      name: 'credit',
      title: '积分',
      description: '配置新用户的初始积分',
      tab: 'general',
    },
    {
      name: 'email_auth',
      title: '邮箱认证',
      description: '配置邮箱登录和邮箱验证',
      tab: 'auth',
    },
    {
      name: 'google_auth',
      title: 'Google 认证',
      description: '配置 Google 登录认证',
      tab: 'auth',
    },
    {
      name: 'github_auth',
      title: 'GitHub 认证',
      description: '配置 GitHub 登录认证',
      tab: 'auth',
    },
    {
      name: 'basic_payment',
      title: '基础支付',
      description: '配置支付方式和默认支付服务商',
      tab: 'payment',
    },
    {
      name: 'stripe',
      title: 'Stripe',
      description:
        '配置 <a href="https://stripe.com" class="text-primary" target="_blank">Stripe</a> 支付',
      tab: 'payment',
    },
    {
      name: 'creem',
      title: 'Creem',
      description:
        '配置 <a href="https://www.creem.io" class="text-primary" target="_blank">Creem</a> 支付',
      tab: 'payment',
    },
    {
      name: 'paypal',
      title: 'PayPal',
      description: '配置 PayPal 支付',
      tab: 'payment',
    },
    {
      name: 'google_analytics',
      title: 'Google Analytics',
      description:
        '配置 <a href="https://analytics.google.com/" class="text-primary" target="_blank">Google Analytics</a> 数据分析',
      tab: 'analytics',
    },
    {
      name: 'clarity',
      title: 'Clarity',
      description:
        '配置 <a href="https://clarity.microsoft.com/" class="text-primary" target="_blank">Clarity</a> 用户行为分析',
      tab: 'analytics',
    },
    {
      name: 'plausible',
      title: 'Plausible',
      description:
        '配置 <a href="https://plausible.io/" class="text-primary" target="_blank">Plausible</a> 数据分析',
      tab: 'analytics',
    },
    {
      name: 'openpanel',
      title: 'OpenPanel',
      description:
        '配置 <a href="https://openpanel.dev/" class="text-primary" target="_blank">OpenPanel</a> 数据分析',
      tab: 'analytics',
    },
    {
      name: 'vercel_analytics',
      title: 'Vercel Analytics',
      description:
        '配置 <a href="https://vercel.com/docs/analytics/" class="text-primary" target="_blank">Vercel Analytics</a> 数据分析',
      tab: 'analytics',
    },
    {
      name: 'resend',
      title: 'Resend',
      description: '配置 Resend 邮件发送服务',
      tab: 'email',
    },
    {
      name: 'r2',
      title: 'Cloudflare R2',
      description: '配置 Cloudflare R2 对象存储',
      tab: 'storage',
    },
    {
      name: 'openrouter',
      title: 'OpenRouter',
      description: `配置 <a href="https://openrouter.ai" class="text-primary" target="_blank">OpenRouter</a> AI 服务`,
      tab: 'ai',
    },
    {
      name: 'replicate',
      title: 'Replicate',
      description: `配置 <a href="https://replicate.com" class="text-primary" target="_blank">Replicate</a> AI 服务`,
      tab: 'ai',
    },
    {
      name: 'fal',
      title: 'Fal',
      description: `配置 <a href="https://fal.ai" class="text-primary" target="_blank">Fal</a> AI 服务`,
      tab: 'ai',
    },
    {
      name: 'gemini',
      title: 'Gemini',
      description: `配置 <a href="https://aistudio.google.com/api-keys" class="text-primary" target="_blank">Gemini</a> AI 服务`,
      tab: 'ai',
    },
    {
      name: 'kie',
      title: 'Kie',
      description: `配置 <a href="https://kie.ai" class="text-primary" target="_blank">Kie</a> AI 服务`,
      tab: 'ai',
    },
    {
      name: 'adsense',
      title: 'AdSense',
      description: '配置 Google AdSense 广告',
      tab: 'ads',
    },
    {
      name: 'affonso',
      title: 'Affonso',
      description:
        '配置 <a href="https://affonso.io?atp=shipany" class="text-primary" target="_blank">Affonso</a> 联盟营销',
      tab: 'affiliate',
    },
    {
      name: 'promotekit',
      title: 'PromoteKit',
      description:
        '配置 <a href="https://www.promotekit.com?via=shipany" class="text-primary" target="_blank">PromoteKit</a> 联盟营销',
      tab: 'affiliate',
    },
    {
      name: 'crisp',
      title: 'Crisp',
      description:
        '配置 <a href="https://crisp.chat" class="text-primary" target="_blank">Crisp</a> 在线客服',
      tab: 'customer_service',
    },
    {
      name: 'tawk',
      title: 'Tawk',
      description:
        '配置 <a href="https://www.tawk.to" class="text-primary" target="_blank">Tawk</a> 在线客服',
      tab: 'customer_service',
    },
  ];
  return settingGroups;
}

export async function getSettings() {
  const settings: Setting[] = [
    {
      name: 'app_name',
      title: '应用名称',
      placeholder: 'ShipAny',
      type: 'text',
      group: 'appinfo',
      tab: 'general',
    },
    {
      name: 'app_description',
      title: '应用描述',
      placeholder: 'ShipAny 是一个用于构建 AI SaaS 产品的 Next.js 模板。',
      type: 'textarea',
      group: 'appinfo',
      tab: 'general',
    },
    {
      name: 'app_logo',
      title: '应用 Logo',
      type: 'upload_image',
      group: 'appinfo',
      tab: 'general',
    },
    {
      name: 'app_preview_image',
      title: '应用预览图',
      type: 'upload_image',
      group: 'appinfo',
      tab: 'general',
    },
    {
      name: 'initial_role_enabled',
      title: '启用初始角色',
      type: 'switch',
      value: 'false',
      group: 'user_role',
      tab: 'general',
      tip: '是否为新注册用户自动分配初始角色',
    },
    {
      name: 'initial_role_name',
      title: '初始角色',
      type: 'select',
      value: 'viewer',
      options: [
        { title: '查看者', value: 'viewer' },
        { title: '编辑者', value: 'editor' },
        { title: '管理员', value: 'admin' },
        { title: '超级管理员', value: 'super_admin' },
      ],
      group: 'user_role',
      tab: 'general',
      tip: '新注册用户默认获得的角色',
    },
    {
      name: 'initial_credits_enabled',
      title: '启用初始积分',
      type: 'switch',
      value: 'false',
      group: 'credit',
      tab: 'general',
      tip: '是否向新注册用户赠送初始积分',
    },
    {
      name: 'initial_credits_amount',
      title: '初始积分数量',
      type: 'number',
      placeholder: '0',
      group: 'credit',
      tab: 'general',
      tip: '赠送给新注册用户的积分数量',
    },
    {
      name: 'initial_credits_valid_days',
      title: '初始积分有效天数',
      type: 'number',
      placeholder: '30',
      group: 'credit',
      tab: 'general',
      tip: '初始积分将在指定天数后过期',
    },
    {
      name: 'initial_credits_description',
      title: '初始积分说明',
      type: 'text',
      placeholder: '免费试用赠送的初始积分',
      group: 'credit',
      tab: 'general',
      tip: '初始积分记录中显示的说明文字',
    },
    {
      name: 'email_auth_enabled',
      title: '启用邮箱认证',
      type: 'switch',
      value: 'true',
      group: 'email_auth',
      tab: 'auth',
    },
    {
      name: 'email_verification_enabled',
      title: '要求邮箱验证',
      type: 'switch',
      value: 'false',
      group: 'email_auth',
      tab: 'auth',
      tip: '要求用户验证邮箱后才能登录；使用前需要先配置邮件服务，例如 Resend。',
    },
    {
      name: 'google_auth_enabled',
      title: '启用 Google 认证',
      type: 'switch',
      value: 'false',
      group: 'google_auth',
      tab: 'auth',
    },
    {
      name: 'google_one_tap_enabled',
      title: '启用 Google One Tap',
      type: 'switch',
      value: 'false',
      group: 'google_auth',
      tab: 'auth',
    },
    {
      name: 'google_client_id',
      title: 'Google Client ID',
      type: 'text',
      placeholder: '',
      group: 'google_auth',
      tab: 'auth',
    },
    {
      name: 'google_client_secret',
      title: 'Google Client Secret',
      type: 'password',
      placeholder: '',
      group: 'google_auth',
      tab: 'auth',
    },
    {
      name: 'github_auth_enabled',
      title: '启用 GitHub 认证',
      type: 'switch',
      group: 'github_auth',
      tab: 'auth',
    },
    {
      name: 'github_client_id',
      title: 'Github Client ID',
      type: 'text',
      placeholder: '',
      group: 'github_auth',
      tab: 'auth',
    },
    {
      name: 'github_client_secret',
      title: 'Github Client Secret',
      type: 'password',
      placeholder: '',
      group: 'github_auth',
      tab: 'auth',
    },
    {
      name: 'select_payment_enabled',
      title: '允许选择支付方式',
      type: 'switch',
      value: 'false',
      tip: '启用后用户可以选择支付方式；关闭后将直接使用默认支付服务商',
      placeholder: '',
      group: 'basic_payment',
      tab: 'payment',
    },
    {
      name: 'default_payment_provider',
      title: '默认支付服务商',
      type: 'select',
      value: 'stripe',
      options: [
        {
          title: 'Stripe',
          value: 'stripe',
        },
        {
          title: 'Creem',
          value: 'creem',
        },
        {
          title: 'PayPal',
          value: 'paypal',
        },
      ],
      tip: '选择系统默认使用的支付服务商',
      group: 'basic_payment',
      tab: 'payment',
    },
    {
      name: 'stripe_enabled',
      title: '启用 Stripe',
      type: 'switch',
      value: 'false',
      placeholder: '',
      group: 'stripe',
      tab: 'payment',
    },
    {
      name: 'stripe_publishable_key',
      title: 'Stripe Publishable Key',
      type: 'text',
      placeholder: 'pk_xxx',
      group: 'stripe',
      tab: 'payment',
    },
    {
      name: 'stripe_secret_key',
      title: 'Stripe Secret Key',
      type: 'password',
      placeholder: 'sk_xxx',
      group: 'stripe',
      tab: 'payment',
    },
    {
      name: 'stripe_signing_secret',
      title: 'Stripe Signing Secret',
      type: 'password',
      placeholder: 'whsec_xxx',
      tip: 'Stripe Signing Secret 用于验证 Stripe 发送的 Webhook 通知',
      group: 'stripe',
      tab: 'payment',
    },
    {
      name: 'stripe_payment_methods',
      title: 'Stripe Payment Methods',
      type: 'checkbox',
      tip: '如果不设置，将只启用银行卡支付方式。',
      options: [
        { title: '银行卡', value: 'card' },
        { title: '微信支付', value: 'wechat_pay' },
        { title: '支付宝', value: 'alipay' },
      ],
      value: ['card'],
      group: 'stripe',
      tab: 'payment',
    },
    {
      name: 'stripe_promotion_codes',
      title: 'Stripe Promotion Codes',
      type: 'textarea',
      attributes: {
        rows: 6,
      },
      placeholder: `{
  "starter": "promo_xxx",
  "standard-monthly": "promo_xxx",
  "premium-yearly": "promo_xxx"
}`,
      group: 'stripe',
      tab: 'payment',
      tip: '将价格表中的 product_id 映射到 Stripe 中创建的 <a href="https://dashboard.stripe.com/coupons" class="text-primary" target="_blank">promotion_code</a>。内容必须是有效的 JSON 对象。',
    },
    {
      name: 'stripe_allow_promotion_codes',
      title: '允许使用 Stripe Promotion Codes',
      type: 'switch',
      value: 'false',
      group: 'stripe',
      tab: 'payment',
      tip: '允许用户输入自定义优惠码；仅在未提供预设 promotion_code 时生效',
    },
    {
      name: 'creem_enabled',
      title: '启用 Creem',
      type: 'switch',
      value: 'false',
      group: 'creem',
      tab: 'payment',
    },
    {
      name: 'creem_environment',
      title: 'Creem Environment',
      type: 'select',
      value: 'sandbox',
      options: [
        { title: '沙盒', value: 'sandbox' },
        { title: '生产环境', value: 'production' },
      ],
      group: 'creem',
      tab: 'payment',
    },
    {
      name: 'creem_api_key',
      title: 'Creem API Key',
      type: 'password',
      placeholder: 'creem_xxx',
      group: 'creem',
      tab: 'payment',
    },
    {
      name: 'creem_signing_secret',
      title: 'Creem Signing Secret',
      type: 'password',
      placeholder: 'whsec_xxx',
      group: 'creem',
      tab: 'payment',
      tip: 'Creem Signing Secret 用于验证 Creem 发送的 Webhook 通知',
    },
    {
      name: 'creem_product_ids',
      title: 'Creem Product IDs Mapping',
      type: 'textarea',
      attributes: {
        rows: 6,
      },
      placeholder: `{
  "starter": "prod_xxx",
  "standard-monthly": "prod_xxx",
  "premium-yearly": "prod_xxx"
}`,
      group: 'creem',
      tab: 'payment',
      tip: '将价格表中的 product_id 映射到 Creem 中创建的 <a href="https://www.creem.io/dashboard/products" class="text-primary" target="_blank">payment_product_id</a>。内容必须是有效的 JSON 对象。',
    },
    {
      name: 'paypal_enabled',
      title: '启用 PayPal',
      type: 'switch',
      value: 'false',
      group: 'paypal',
      tab: 'payment',
    },
    {
      name: 'paypal_environment',
      title: 'PayPal Environment',
      type: 'select',
      value: 'sandbox',
      options: [
        { title: '沙盒', value: 'sandbox' },
        { title: '生产环境', value: 'production' },
      ],
      group: 'paypal',
      tab: 'payment',
    },
    {
      name: 'paypal_client_id',
      title: 'PayPal Client ID',
      type: 'text',
      placeholder: 'paypal_xxx',
      group: 'paypal',
      tab: 'payment',
    },
    {
      name: 'paypal_client_secret',
      title: 'PayPal Client Secret',
      type: 'password',
      placeholder: 'paypal_xxx',
      group: 'paypal',
      tab: 'payment',
    },
    {
      name: 'paypal_webhook_id',
      title: 'PayPal Webhook ID',
      type: 'text',
      placeholder: 'xxx',
      tip: 'PayPal Webhook ID 用于验证 PayPal 发送的 Webhook 通知，可在 PayPal Developer Dashboard > Webhooks 中找到。',
      group: 'paypal',
      tab: 'payment',
    },
    {
      name: 'google_analytics_id',
      title: 'Google Analytics ID',
      type: 'text',
      placeholder: '',
      group: 'google_analytics',
      tab: 'analytics',
    },
    {
      name: 'clarity_id',
      title: 'Clarity ID',
      type: 'text',
      placeholder: '',
      group: 'clarity',
      tab: 'analytics',
    },
    {
      name: 'plausible_domain',
      title: 'Plausible Domain',
      type: 'text',
      placeholder: 'shipany.site',
      group: 'plausible',
      tab: 'analytics',
    },
    {
      name: 'plausible_src',
      title: 'Plausible Script Src',
      type: 'url',
      placeholder: 'https://plausible.io/js/script.js',
      group: 'plausible',
      tab: 'analytics',
    },
    {
      name: 'openpanel_client_id',
      title: 'OpenPanel Client ID',
      type: 'text',
      placeholder: '',
      group: 'openpanel',
      tab: 'analytics',
    },
    {
      name: 'vercel_analytics_enabled',
      title: '启用 Vercel Analytics',
      type: 'switch',
      value: 'false',
      group: 'vercel_analytics',
      tab: 'analytics',
    },
    {
      name: 'resend_api_key',
      title: 'Resend API Key',
      type: 'password',
      placeholder: '',
      group: 'resend',
      tab: 'email',
    },
    {
      name: 'resend_sender_email',
      title: 'Resend Sender Email',
      type: 'text',
      placeholder: 'ShipAny Two <no-reply@mail.shipany.site>',
      group: 'resend',
      tab: 'email',
    },
    {
      name: 'r2_access_key',
      title: 'Cloudflare Access Key',
      type: 'text',
      placeholder: '',
      group: 'r2',
      tab: 'storage',
    },
    {
      name: 'r2_secret_key',
      title: 'Cloudflare Secret Key',
      type: 'password',
      placeholder: '',
      group: 'r2',
      tab: 'storage',
    },
    {
      name: 'r2_bucket_name',
      title: 'Bucket Name',
      type: 'text',
      placeholder: '',
      group: 'r2',
      tab: 'storage',
    },
    {
      name: 'r2_upload_path',
      title: 'Upload Path',
      type: 'text',
      placeholder: 'uploads',
      tip: '文件上传路径；留空时使用默认上传路径。例如：uploads/foo/bar',
      group: 'r2',
      tab: 'storage',
    },
    {
      name: 'r2_endpoint',
      title: 'Endpoint',
      type: 'url',
      placeholder: 'https://<account-id>.r2.cloudflarestorage.com',
      tip: '留空时使用默认的 R2 Endpoint',
      group: 'r2',
      tab: 'storage',
    },
    {
      name: 'r2_domain',
      title: 'Domain',
      type: 'url',
      placeholder: '',
      group: 'r2',
      tab: 'storage',
    },
    {
      name: 'openrouter_api_key',
      title: 'OpenRouter API Key',
      type: 'password',
      placeholder: 'sk-or-xxx',
      group: 'openrouter',
      tab: 'ai',
    },
    {
      name: 'openrouter_base_url',
      title: 'OpenRouter Base URL',
      type: 'url',
      placeholder: 'https://openrouter.ai/api/v1',
      tip: '可以填写任意兼容 OpenAI 的 API URL；留空时使用默认 OpenRouter API URL',
      group: 'openrouter',
      tab: 'ai',
    },
    {
      name: 'replicate_api_token',
      title: 'Replicate API Token',
      type: 'password',
      placeholder: 'r8_xxx',
      group: 'replicate',
      tab: 'ai',
    },
    {
      name: 'replicate_custom_storage',
      title: 'Replicate 自定义存储',
      type: 'switch',
      value: 'false',
      group: 'replicate',
      tab: 'ai',
      tip: '使用自定义存储保存 Replicate 生成的文件',
    },
    {
      name: 'fal_api_key',
      title: 'Fal API Key',
      type: 'password',
      placeholder: 'fal_xxx',
      group: 'fal',
      tip: 'Fal API Key 用于访问 Fal API',
      tab: 'ai',
    },
    {
      name: 'fal_custom_storage',
      title: 'Fal 自定义存储',
      type: 'switch',
      value: 'false',
      group: 'fal',
      tab: 'ai',
      tip: '使用自定义存储保存 Fal 生成的文件',
    },
    {
      name: 'gemini_api_key',
      title: 'Gemini API Key',
      type: 'password',
      placeholder: 'AIza...',
      group: 'gemini',
      tip: '用于访问 Google Gemini API',
      tab: 'ai',
    },
    {
      name: 'kie_api_key',
      title: 'Kie API Key',
      type: 'password',
      placeholder: 'xxx',
      group: 'kie',
      tip: 'Kie API Key 用于访问 Kie API',
      tab: 'ai',
    },
    {
      name: 'kie_custom_storage',
      title: 'Kie 自定义存储',
      type: 'switch',
      value: 'false',
      group: 'kie',
      tab: 'ai',
      tip: '使用自定义存储保存 Kie 生成的文件',
    },
    {
      name: 'adsense_code',
      title: 'AdSense Code',
      type: 'text',
      placeholder: 'ca-pub-xxx',
      group: 'adsense',
      tab: 'ads',
    },
    {
      name: 'affonso_enabled',
      title: '启用 Affonso',
      type: 'switch',
      value: 'false',
      group: 'affonso',
      tab: 'affiliate',
    },
    {
      name: 'affonso_id',
      title: 'Affonso ID',
      type: 'text',
      placeholder: 'xxx',
      tip: 'Affonso 联盟项目的 Program ID',
      group: 'affonso',
      tab: 'affiliate',
    },
    {
      name: 'affonso_cookie_duration',
      title: 'Affonso Cookie Duration',
      type: 'number',
      placeholder: '30',
      tip: 'Affonso Cookie 的有效天数，默认 30 天',
      value: '30',
      group: 'affonso',
      tab: 'affiliate',
    },
    {
      name: 'promotekit_enabled',
      title: '启用 PromoteKit',
      type: 'switch',
      value: 'false',
      group: 'promotekit',
      tab: 'affiliate',
    },
    {
      name: 'promotekit_id',
      title: 'PromoteKit ID',
      type: 'text',
      placeholder: 'xxx',
      tip: 'PromoteKit 联盟项目的 Program ID',
      group: 'promotekit',
      tab: 'affiliate',
    },
    {
      name: 'crisp_enabled',
      title: '启用 Crisp',
      type: 'switch',
      value: 'false',
      group: 'crisp',
      tab: 'customer_service',
    },
    {
      name: 'crisp_website_id',
      title: 'Crisp Website ID',
      type: 'text',
      placeholder: 'xxx',
      group: 'crisp',
      tab: 'customer_service',
    },
    {
      name: 'tawk_enabled',
      title: '启用 Tawk',
      type: 'switch',
      value: 'false',
      group: 'tawk',
      tab: 'customer_service',
    },
    {
      name: 'tawk_property_id',
      title: 'Tawk Property ID',
      tip: 'Tawk Property ID 与你的 Tawk 账户关联',
      type: 'text',
      placeholder: 'xxx',
      group: 'tawk',
      tab: 'customer_service',
    },
    {
      name: 'tawk_widget_id',
      title: 'Tawk Widget ID',
      type: 'text',
      placeholder: 'xxx',
      group: 'tawk',
      tab: 'customer_service',
    },
  ];

  return settings;
}

// SECURITY: this whitelist gates which DB-stored config keys are allowed to
// reach the browser via `getPublicConfigs()`. Only add keys that are safe to
// expose publicly (feature flags, public client IDs). NEVER add API keys,
// client secrets, signing secrets, or any credential here.
export const publicSettingNames = [
  'email_auth_enabled',
  'email_verification_enabled',
  'google_auth_enabled',
  'google_one_tap_enabled',
  'google_client_id',
  'github_auth_enabled',
  'select_payment_enabled',
  'default_payment_provider',
  'stripe_enabled',
  'creem_enabled',
  'paypal_enabled',
  'affonso_enabled',
  'promotekit_enabled',
  'crisp_enabled',
  'tawk_enabled',
];

export async function getAllSettingNames() {
  const settings = await getSettings();
  const settingNames: string[] = [];

  settings.forEach((setting: Setting) => {
    settingNames.push(setting.name);
  });

  return settingNames;
}
