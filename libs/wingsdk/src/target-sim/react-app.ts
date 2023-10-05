import { Construct } from "constructs";
import { ISimulatorResource } from "./resource";
import { ReactAppSchema, REACT_APP_TYPE } from "./schema-resources";
import { bindSimulatorResource, makeSimulatorJsClient } from "./util";
import * as cloud from "../cloud";
import * as core from "../core";
import * as ex from "../ex";
import { BaseResourceSchema } from "../simulator";
import { IInflightHost } from "../std";

const DEFAULT_START_COMMAND = "npm run start";
export class ReactApp extends ex.ReactApp implements ISimulatorResource {
  private _host?: cloud.IWebsite;
  private readonly _startCommand: string;
  constructor(scope: Construct, id: string, props: ex.ReactAppProps) {
    super(scope, id, props);

    this._startCommand = this._useBuildCommand
      ? props.buildCommand ?? ex.DEFAULT_REACT_APP_BUILD_COMMAND
      : `PORT=${this._localPort} ${
          props.startCommand ?? DEFAULT_START_COMMAND
        }`;

    if (this._useBuildCommand) {
      // In the future we can create an host (proxy like) for the development one if needed
      this._host = cloud.Website._newWebsite(this, `${this.node.id}-host`, {
        ...this._hostProps,
        path: this._buildPath,
      });

      this.node.addDependency(this._websiteHost);
      core.Connections.of(this).add({
        source: this,
        target: this._websiteHost as cloud.Website,
        name: `host`,
      });
    }
  }

  protected get _websiteHost(): cloud.IWebsite {
    return this._host ?? { url: `http://localhost:${this._localPort}` };
  }

  public toSimulator(): BaseResourceSchema {
    const schema: ReactAppSchema = {
      type: REACT_APP_TYPE,
      path: this.node.path,
      props: {
        path: this._projectPath,
        startCommand: this._startCommand,
        environmentVariables: Object.fromEntries(
          this._environmentVariables.entries()
        ),
        useBuildCommand: this._useBuildCommand,
        url: this.url,
      },
      attrs: {},
    };
    return schema;
  }

  public bind(host: IInflightHost, ops: string[]): void {
    bindSimulatorResource(__filename, this, host);
    super.bind(host, ops);
  }

  /** @internal */
  public _toInflight(): string {
    return makeSimulatorJsClient(__filename, this);
  }
}