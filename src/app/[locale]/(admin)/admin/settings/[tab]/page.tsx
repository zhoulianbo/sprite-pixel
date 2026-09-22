import { revalidatePath } from 'next/cache';
import { setRequestLocale } from 'next-intl/server';

import { PERMISSIONS, requireAllPermissions } from '@/core/rbac';
import { Header, Main, MainHeader } from '@/shared/blocks/dashboard';
import { FormCard } from '@/shared/blocks/form';
import { getConfigs, saveConfigs } from '@/shared/models/config';
import { getUserInfo } from '@/shared/models/user';
import {
  getSettingGroups,
  getSettings,
  getSettingTabs,
} from '@/shared/services/settings';
import { Crumb } from '@/shared/types/blocks/common';
import { Form as FormType } from '@/shared/types/blocks/form';

export default async function SettingsPage({
  params,
}: {
  params: Promise<{ locale: string; tab: string }>;
}) {
  const { locale, tab } = await params;
  setRequestLocale(locale);

  // Check if user has permission to read settings
  await requireAllPermissions({
    codes: [PERMISSIONS.SETTINGS_READ, PERMISSIONS.SETTINGS_WRITE],
    redirectUrl: '/admin/no-permission',
    locale,
  });

  const configs = await getConfigs();

  const settingGroups = await getSettingGroups();
  const settings = await getSettings();

  const crumbs: Crumb[] = [
    { title: '管理后台', url: '/admin' },
    { title: '设置', is_active: true },
  ];

  const tabs = await getSettingTabs(tab ?? 'auth');

  const handleSubmit = async (data: FormData, passby: any) => {
    'use server';

    const user = await getUserInfo();

    if (!user) {
      throw new Error('no auth');
    }

    await requireAllPermissions({
      codes: [PERMISSIONS.SETTINGS_READ, PERMISSIONS.SETTINGS_WRITE],
      locale,
    });

    const latestConfigs = await getConfigs();
    data.forEach((value, name) => {
      latestConfigs[name] = value as string;
    });

    await saveConfigs(latestConfigs);

    if (passby?.tab === 'analytics') {
      revalidatePath('/', 'layout');
    }

    return {
      status: 'success',
      message: '设置已更新',
    };
  };

  let forms: FormType[] = [];

  settingGroups.forEach((group) => {
    if (group.tab !== tab) {
      return;
    }

    forms.push({
      title: group.title,
      description: group.description,
      fields: settings
        .filter((setting) => setting.group === group.name)
        .map((setting) => ({
          name: setting.name,
          title: setting.title,
          type: setting.type as any,
          placeholder: setting.placeholder,
          group: setting.group,
          options: setting.options,
          tip: setting.tip,
          value: setting.value,
          attributes: setting.attributes,
        })),
      passby: {
        provider: group.name,
        tab: group.tab,
      },
      data: configs,
      submit: {
        button: {
          title: '保存',
        },
        handler: handleSubmit as any,
      },
    });
  });

  return (
    <>
      <Header crumbs={crumbs} />
      <Main>
        <MainHeader title="设置" tabs={tabs} />
        {forms.map((form) => (
          <FormCard
            key={form.title}
            title={form.title}
            description={form.description}
            form={form}
            className="mb-8 md:max-w-xl"
            defaultCollapsed={false}
            collapsible={true}
          />
        ))}
      </Main>
    </>
  );
}
