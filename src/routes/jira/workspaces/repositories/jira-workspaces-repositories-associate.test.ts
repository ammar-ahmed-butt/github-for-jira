import { getLogger } from "config/logger";
import express, { Application } from "express";
import { getFrontendApp } from "~/src/app";
import supertest from "supertest";
import { Subscription } from "models/subscription";
import { RepoSyncState } from "models/reposyncstate";
import { Installation } from "models/installation";
import { createQueryStringHash, encodeSymmetric } from "atlassian-jwt";
import { Errors } from "config/errors";

describe("Workspaces Associate Repository", () => {
	let app: Application;
	let installation: Installation;
	let sub: Subscription;

	beforeEach(async () => {
		installation = await Installation.install({
			host: jiraHost,
			sharedSecret: "shared-secret",
			clientKey: "jira-client-key"
		});

		sub = await Subscription.install({
			host: jiraHost,
			installationId: 1234,
			hashedClientKey: "key-123",
			gitHubAppId: undefined
		});
	});

	const generateJwt = async () => {
		return encodeSymmetric({
			qsh: createQueryStringHash({
				method: "POST",
				pathname: "/jira/workspaces/repositories/associate"
			}, false),
			iss: installation.plainClientKey
		}, await installation.decrypt("encryptedSharedSecret", getLogger("test")));
	};

	it("Should return a 400 status if no repoId is provided", async () => {
		app = express();
		app.use((req, _, next) => {
			req.log = getLogger("test");
			req.csrfToken = jest.fn();
			next();
		});
		app.use(getFrontendApp());

		await supertest(app)
			.post("/jira/workspaces/repositories/associate")
			.set({
				authorization: `JWT ${await generateJwt()}`
			})
			.expect(res => {
				expect(res.status).toBe(400);
				expect(res.text).toContain(Errors.MISSING_REPOSITORY_ID);
			});
	});

	it("Should return repo payload when repoId and Jira host match", async () => {
		app = express();
		app.use((req, _, next) => {
			req.log = getLogger("test");
			req.csrfToken = jest.fn();
			next();
		});
		app.use(getFrontendApp());

		const repo1 = await RepoSyncState.create({
			subscriptionId: sub.id,
			repoId: 1,
			repoName: "my-repo",
			repoOwner: "atlassian",
			repoFullName: "atlassian/my-repo",
			repoUrl: "https://github.com/atlassian/my-repo"
		});

		Date.now = jest.fn(() => 1487076708000);

		const associateRepoRes = {
			success: true,
			associatedRepository: {
				preventTransitions: false,
				operationType: "NORMAL",
				repository: {
					id: "1",
					name: repo1.repoFullName,
					url: repo1.repoUrl,
					updateSequenceId: 1487076708000
				},
				properties: {
					installationId: 1234
				}
			}
		};

		await supertest(app)
			.post("/jira/workspaces/repositories/associate")
			.set({
				authorization: `JWT ${await generateJwt()}`
			})
			.send({
				id: repo1.repoId
			})
			.expect(res => {
				expect(res.status).toBe(200);
				expect(res.text).toContain(JSON.stringify(associateRepoRes));
			});
	});

	it("Should return empty object when no repo is found", async () => {
		app = express();
		app.use((req, _, next) => {
			req.log = getLogger("test");
			req.csrfToken = jest.fn();
			next();
		});
		app.use(getFrontendApp());

		Date.now = jest.fn(() => 1487076708000);

		const response = {
			success: true,
			associatedRepository: {}
		};

		await supertest(app)
			.post("/jira/workspaces/repositories/associate")
			.set({
				authorization: `JWT ${await generateJwt()}`
			})
			.send({
				id: "1"
			})
			.expect(res => {
				expect(res.status).toBe(200);
				expect(res.text).toContain(JSON.stringify(response));
			});
	});
});
