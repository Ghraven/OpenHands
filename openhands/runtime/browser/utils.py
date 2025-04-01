import os

from openhands.core.exceptions import BrowserUnavailableException
from openhands.core.schema import ActionType
from openhands.events.action import BrowseInteractiveAction, BrowseURLAction
from openhands.events.observation import BrowserOutputObservation
from openhands.runtime.browser.browser_env import BrowserEnv
from openhands.utils.async_utils import call_sync_from_async


async def browse(
    action: BrowseURLAction | BrowseInteractiveAction, browser: BrowserEnv | None
) -> BrowserOutputObservation:
    if browser is None:
        raise BrowserUnavailableException()

    if isinstance(action, BrowseURLAction):
        # legacy BrowseURLAction
        asked_url = action.url
        if not asked_url.startswith('http'):
            asked_url = os.path.abspath(os.curdir) + action.url
        action_str = f'goto("{asked_url}")'

    elif isinstance(action, BrowseInteractiveAction):
        # new BrowseInteractiveAction, supports full featured BrowserGym actions
        # action in BrowserGym: see https://github.com/ServiceNow/BrowserGym/blob/main/core/src/browsergym/core/action/functions.py
        action_str = action.browser_actions
    else:
        raise ValueError(f'Invalid action type: {action.action}')

    try:
        # obs provided by BrowserGym: see https://github.com/ServiceNow/BrowserGym/blob/main/core/src/browsergym/core/env.py#L396
        obs = await call_sync_from_async(browser.step, action_str)

        # Extract values with type checking
        text_content = obs.get('text_content', '')
        if not isinstance(text_content, str):
            text_content = str(text_content)

        url = obs.get('url', '')
        if not isinstance(url, str):
            url = str(url)

        image_content = obs.get('image_content', [])
        if not isinstance(image_content, list):
            image_content = []

        open_pages_urls = obs.get('open_pages_urls', [])
        if not isinstance(open_pages_urls, list):
            open_pages_urls = []

        active_page_index = obs.get('active_page_index', -1)
        if not isinstance(active_page_index, int):
            try:
                active_page_index = int(active_page_index)
            except (ValueError, TypeError):
                active_page_index = -1

        dom_object = obs.get('dom_object', {})
        if not isinstance(dom_object, dict):
            dom_object = {}

        axtree_object = obs.get('axtree_object', {})
        if not isinstance(axtree_object, dict):
            axtree_object = {}

        extra_element_properties = obs.get('extra_element_properties', {})
        if not isinstance(extra_element_properties, dict):
            extra_element_properties = {}

        last_action = obs.get('last_action', '')
        if not isinstance(last_action, str):
            last_action = str(last_action)

        last_action_error = obs.get('last_action_error', '')
        if not isinstance(last_action_error, str):
            last_action_error = str(last_action_error)

        return BrowserOutputObservation(
            content=text_content,  # text content of the page
            url=url,  # URL of the page
            screenshot=obs.get('screenshot', None),  # base64-encoded screenshot, png
            set_of_marks=obs.get(
                'set_of_marks', None
            ),  # base64-encoded Set-of-Marks annotated screenshot, png,
            goal_image_urls=image_content,
            open_pages_urls=open_pages_urls,  # list of open pages
            active_page_index=active_page_index,  # index of the active page
            dom_object=dom_object,  # DOM object
            axtree_object=axtree_object,  # accessibility tree object
            extra_element_properties=extra_element_properties,
            focused_element_bid=obs.get(
                'focused_element_bid', None
            ),  # focused element bid
            last_browser_action=last_action,  # last browser env action performed
            last_browser_action_error=last_action_error,
            error=bool(last_action_error),  # error flag
            trigger_by_action=action.action,
        )
    except Exception as e:
        error_message = str(e)
        url_value = asked_url if action.action == ActionType.BROWSE else ''

        return BrowserOutputObservation(
            content=error_message,
            screenshot='',
            error=True,
            last_browser_action_error=error_message,
            url=url_value,
            trigger_by_action=action.action,
        )
