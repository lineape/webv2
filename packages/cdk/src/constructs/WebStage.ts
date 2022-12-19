import { CfnOutput, Stack, Stage, StageProps } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { SsrWebsite, SsrWebsiteCdn } from './SsrWebsite';
import { DomainConfig, DomainConfigProps } from './DomainConfig';

export interface WebStageProps extends StageProps {
  readonly domain?: DomainConfigProps;
}

/**
 * Responsible for creating website stacks and wiring up their constructs.
 *
 * ```
 *          ┌────────────────────────────┐
 *          │Content Distribution Network│
 *          │       <<cloudfront>>       │
 *          └──┬──────────────────────┬──┘
 *             │                      │
 *             │                      │
 *   ┌─────────┼──────────────────────┼─────────────┐
 *   │         │                      │             │
 *   │ ┌───────▼────────┐ ┌───────────▼───────────┐ │
 *   │ │ Next.js server │ │ Next.js Static Assets │ │
 *   │ │   <<lambda>>   │ │       <<bucket>>      │ │
 *   │ └────────────────┘ └───────────────────────┘ │
 *   │                                              │
 *   │                  Website                     │
 *   └──────────────────────────────────────────────┘
 *    Modify by copy/paste via https://asciiflow.com
 * ```
 */
export class WebStage extends Stage {
  constructor(scope: Construct, id: string, props: WebStageProps = {}) {
    super(scope, id, props);

    const stack = new Stack(this, 'Stack');

    const website = new SsrWebsite(stack, 'Website', {
      distDir: 'dist/packages/web',
    });

    const domainConfig =
      props.domain && new DomainConfig(stack, 'DomainNames', props.domain);

    const cdn = new SsrWebsiteCdn(stack, 'Cdn', {
      website,
      domainConfig: domainConfig && {
        domainNames: domainConfig.domainNames,
        certificate: domainConfig.certificate,
      },
    });

    domainConfig?.createDnsRecords(stack, 'DnsRecords', cdn.recordTarget);

    new CfnOutput(stack, 'Url', {
      value: `https://${cdn.cdnDomainName}/`,
    });
  }
}