import { Request, Response } from "express";
import { createUrlWithQueryString } from "utils/create-url-with-query-string";

export const SessionEnterpriseGet = (req: Request, res: Response) => {
	if (!req.params[0]) {
		res.status(400).send("Missing redirect url for session enterprise. Needs to be in format `/session/:redirectUrl`");
		return;
	}

	const url = createUrlWithQueryString(req, req.params[0]);

	// TODO: This title is different for different scenarios, need to add the different scenarios
	const titleForLoading = "Redirecting to your GitHub Enterprise Server instance";

	res.render("gitHub-session.hbs", {
		APP_URL: process.env.APP_URL,
		redirectUrl: new URL(url, process.env.APP_URL).href,
		nonce: res.locals.nonce,
		titleForLoading
	});
};

export const SessionGet = (req: Request, res: Response) => {
	if (!req.params[0]) {
		res.status(400).send("Missing redirect url for session cloud. Needs to be in format `/session/:redirectUrl`");
		return;
	}
	const url = createUrlWithQueryString(req, req.params[0]);

	res.render("gitHub-session.hbs", {
		APP_URL: process.env.APP_URL,
		redirectUrl: new URL(url, process.env.APP_URL).href,
		nonce: res.locals.nonce,
		titleForLoading: "Redirecting to your GitHub Cloud instance"
	});
};