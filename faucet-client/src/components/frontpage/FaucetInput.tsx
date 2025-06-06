import React from 'react';
import { IFaucetConfig } from '../../common/FaucetConfig';
import { IFaucetContext } from '../../common/FaucetContext';
import { FaucetCaptcha } from '../shared/FaucetCaptcha';
import { GithubLogin } from './github/GithubLogin';
import { ZupassLogin } from './zupass/ZupassLogin';
import VoucherInput, { IVoucherInputRef } from './voucher/VoucherInput';

export interface IFaucetInputProps {
  faucetContext: IFaucetContext;
  faucetConfig: IFaucetConfig
  defaultAddr?: string;
  submitInputs(inputs: any): Promise<void>;
}

export interface IFaucetInputState {
  submitting: boolean;
  targetAddr: string;
}

export class FaucetInput extends React.PureComponent<IFaucetInputProps, IFaucetInputState> {
  private faucetCaptcha = React.createRef<FaucetCaptcha>();
  private githubLogin = React.createRef<GithubLogin>();
  private zupassLogin = React.createRef<ZupassLogin>();
  private voucherInput = React.createRef<IVoucherInputRef>();

  constructor(props: IFaucetInputProps) {
    super(props);

    this.state = {
      submitting: false,
      targetAddr: this.props.defaultAddr || "",
		};
  }

	public render(): React.ReactElement<IFaucetInputProps> {
    let needGithubAuth = !!this.props.faucetConfig.modules.github;
    let needZupassAuth = !!this.props.faucetConfig.modules.zupass && !!this.props.faucetConfig.modules.zupass.event;
    let needVoucher = !!this.props.faucetConfig.modules.voucher;
    let requestCaptcha = !!this.props.faucetConfig.modules.captcha?.requiredForStart;
    let inputTypes: string[] = [];
    if(this.props.faucetConfig.modules.ensname?.required) {
      inputTypes.push("ENS name");
    }
    else {
      inputTypes.push("ETH address");
      if(this.props.faucetConfig.modules.ensname)
        inputTypes.push("ENS name");
    }

    let submitBtnCaption: string;
    if(this.props.faucetConfig.modules.pow) {
      submitBtnCaption = "Start Mining";
    }
    else {
      submitBtnCaption = "Request Funds";
    }

    return (
      <div className="faucet-inputs">
        <input 
          className="form-control" 
          value={this.state.targetAddr} 
          placeholder={"Please enter " + (inputTypes.join(" or "))} 
          onChange={(evt) => this.setState({ targetAddr: evt.target.value })} 
        />
        {needGithubAuth ? 
          <GithubLogin 
            faucetConfig={this.props.faucetConfig} 
            faucetContext={this.props.faucetContext} 
            ref={this.githubLogin}
          />
        : null}
        {needZupassAuth ? 
          <React.Suspense fallback={<div>loading...</div>}>
            <ZupassLogin 
              faucetConfig={this.props.faucetConfig} 
              faucetContext={this.props.faucetContext} 
              ref={this.zupassLogin}
            />
          </React.Suspense>
        : null}
        {needVoucher ?
          <VoucherInput
            faucetConfig={this.props.faucetConfig}
            faucetContext={this.props.faucetContext}
            ref={this.voucherInput}
          />
        : null}
        {requestCaptcha ? 
          <div className='faucet-captcha'>
            <FaucetCaptcha 
              faucetConfig={this.props.faucetConfig} 
              ref={this.faucetCaptcha} 
              variant='session'
            />
          </div>
        : null}
        <div className="faucet-actions center">
          <button 
            className="btn btn-success start-action" 
            onClick={(evt) => this.onSubmitBtnClick()} 
            disabled={this.state.submitting}>
              {this.state.submitting ?
              <span className='inline-spinner'>
                <img src={(this.props.faucetContext.faucetUrls.imagesUrl || "/images") + "/spinner.gif"} className="spinner" />
              </span>
              : null}
              {submitBtnCaption}
          </button>
        </div>
      </div>
    );
	}

  private async onSubmitBtnClick() {
    this.setState({
      submitting: true
    });

    try {
      let inputData: any = {};

      inputData.addr = this.state.targetAddr;
      if(this.props.faucetConfig.modules.captcha?.requiredForStart) {
        inputData.captchaToken = await this.faucetCaptcha.current?.getToken();
      }
      if(this.props.faucetConfig.modules.github) {
        inputData.githubToken = await this.githubLogin.current?.getToken();
      }
      if(this.props.faucetConfig.modules.zupass && this.props.faucetConfig.modules.zupass.event) {
        inputData.zupassToken = await this.zupassLogin.current?.getToken();
      }
      if (this.props.faucetConfig.modules.voucher) {
        inputData.voucherCode = this.voucherInput.current?.getCode();
      }

      await this.props.submitInputs(inputData);
    } catch(ex) {
      if(this.faucetCaptcha.current)
        this.faucetCaptcha.current.resetToken();
      throw ex;
    } finally {
      this.setState({
        submitting: false
      });
    }
  }

}
